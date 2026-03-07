import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CheckoutForm } from "./checkout-form";
import { EscrowCheckout } from "./escrow-checkout";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { toTitleCase, getVisitLabel } from "@/lib/format";
import { getEscrowSummary } from "@/lib/escrow";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = parseInt(id);

  const currentUser = await requireAuth();
  if (!canCollectPayments(currentUser.permissionLevel)) {
    redirect(`/patients/${patientId}`);
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      visits: {
        include: {
          operation: { select: { name: true, doctorFee: true, labCostEstimate: true } },
          doctor: { select: { name: true } },
          receipts: {
            select: {
              id: true,
              receiptNo: true,
              amount: true,
              paymentMode: true,
              receiptDate: true,
            },
            orderBy: { receiptDate: "desc" },
          },
          followUps: {
            select: {
              receipts: { select: { amount: true } },
              operationRate: true,
              discount: true,
              quantity: true,
              labRateAmount: true,
              labQuantity: true,
            },
          },
        },
        orderBy: { visitDate: "asc" },
      },
    },
  });

  if (!patient) notFound();

  // Get escrow summary
  const escrow = await getEscrowSummary(patientId);
  const hasEscrow = escrow.deposits > 0 || escrow.fulfilled > 0;

  // Calculate outstanding visits (legacy mode)
  const outstandingVisits = patient.visits
    .map((visit) => {
      const billed = calcBilled(visit);
      const paid = calcPaid(visit.receipts);
      const balance = calcBalance(visit, visit.receipts);
      return {
        id: visit.id,
        caseNo: visit.caseNo,
        visitDate: visit.visitDate.toISOString(),
        operationName: getVisitLabel(visit),
        doctorName: toTitleCase(visit.doctor?.name || "N/A"),
        billed,
        paid,
        balance,
      };
    })
    .filter((v) => v.balance > 0);

  // Chain cost warnings
  const chainWarnings: { operationName: string; doctorFee: number; labCost: number; collected: number; shortfall: number }[] = [];
  for (const visit of patient.visits) {
    if (visit.parentVisitId !== null) continue;
    const doctorFee = visit.operation?.doctorFee;
    if (!doctorFee || doctorFee <= 0) continue;

    const allChainVisits = [visit, ...visit.followUps];
    const totalCollected = allChainVisits.reduce((sum, v) => sum + v.receipts.reduce((s, r) => s + r.amount, 0), 0);
    const totalLabCost = allChainVisits.reduce((sum, v) => sum + v.labRateAmount * v.labQuantity, 0);
    const minimumNeeded = doctorFee + totalLabCost;
    const shortfall = minimumNeeded - totalCollected;

    if (shortfall > 0) {
      chainWarnings.push({
        operationName: getVisitLabel(visit),
        doctorFee,
        labCost: totalLabCost,
        collected: totalCollected,
        shortfall,
      });
    }
  }

  const totalOutstanding = outstandingVisits.reduce((s, v) => s + v.balance, 0);

  // Serialize escrow data for client
  const escrowData = {
    deposits: escrow.deposits,
    fulfilled: escrow.fulfilled,
    balance: escrow.balance,
    recentPayments: escrow.recentPayments.map((p) => ({
      id: p.id,
      receiptNo: p.receiptNo,
      amount: p.amount,
      paymentMode: p.paymentMode,
      paymentDate: p.paymentDate.toISOString(),
      notes: p.notes,
      createdByName: toTitleCase(p.createdBy.name),
    })),
    recentFulfillments: escrow.recentFulfillments.map((f) => ({
      id: f.id,
      amount: f.amount,
      operationName: f.workDone.operation.name,
      caseNo: f.visit.caseNo,
      doctorName: f.doctor ? toTitleCase(f.doctor.name) : null,
      fulfilledAt: f.fulfilledAt.toISOString(),
    })),
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: "Patients", href: "/patients" },
          { label: toTitleCase(patient.name), href: `/patients/${patient.id}` },
          { label: "Checkout" },
        ]} />
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-center">
            <div className="text-xs uppercase tracking-wide opacity-80">
              Payment
            </div>
            <div className="text-2xl font-bold font-mono">#{patient.code}</div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {patient.salutation && `${patient.salutation}. `}
              {toTitleCase(patient.name)}
            </h2>
            <p className="text-muted-foreground">
              Escrow Balance: {"\u20B9"}
              {escrowData.balance.toLocaleString("en-IN")}
              {totalOutstanding > 0 && !hasEscrow && (
                <> · Legacy Outstanding: {"\u20B9"}{totalOutstanding.toLocaleString("en-IN")}</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Minimum collection warnings */}
      {chainWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="text-sm font-medium text-amber-800">Collection Warning</div>
          {chainWarnings.map((w, i) => (
            <div key={i} className="text-sm text-amber-700">
              {w.operationName}: {"\u20B9"}{w.collected.toLocaleString("en-IN")} collected, but doctor fee is {"\u20B9"}{w.doctorFee.toLocaleString("en-IN")}{w.labCost > 0 ? ` + lab \u20B9${w.labCost.toLocaleString("en-IN")}` : ""} — {"\u20B9"}{w.shortfall.toLocaleString("en-IN")} short
            </div>
          ))}
        </div>
      )}

      {/* Escrow Deposit (primary) */}
      <EscrowCheckout
        patientId={patient.id}
        escrow={escrowData}
      />

      {/* Legacy outstanding section — only if patient has old outstanding visits and no escrow payments yet */}
      {outstandingVisits.length > 0 && !hasEscrow && (
        <>
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Legacy Per-Visit Payments</h3>
          </div>
          <CheckoutForm
            patientId={patient.id}
            patientCode={patient.code}
            patientName={toTitleCase(patient.name)}
            outstandingVisits={outstandingVisits}
            recentReceipts={[]}
          />
        </>
      )}
    </div>
  );
}
