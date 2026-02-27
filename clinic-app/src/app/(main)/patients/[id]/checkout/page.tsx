import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CheckoutForm } from "./checkout-form";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";

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

  // Calculate outstanding visits
  const outstandingVisits = patient.visits
    .map((visit) => {
      const billed = calcBilled(visit);
      const paid = calcPaid(visit.receipts);
      const balance = calcBalance(visit, visit.receipts);
      return {
        id: visit.id,
        caseNo: visit.caseNo,
        visitDate: visit.visitDate.toISOString(),
        operationName: visit.operation?.name || "Visit",
        doctorName: visit.doctor?.name || "N/A",
        billed,
        paid,
        balance,
      };
    })
    .filter((v) => v.balance > 0);

  // Chain cost warnings: for root visits with doctorFee, check if collected >= doctorFee + labCost
  const chainWarnings: { operationName: string; doctorFee: number; labCost: number; collected: number; shortfall: number }[] = [];
  for (const visit of patient.visits) {
    if (visit.parentVisitId !== null) continue; // skip follow-ups, only check root
    const doctorFee = visit.operation?.doctorFee;
    if (!doctorFee || doctorFee <= 0) continue;

    const allChainVisits = [visit, ...visit.followUps];
    const totalCollected = allChainVisits.reduce((sum, v) => sum + v.receipts.reduce((s, r) => s + r.amount, 0), 0);
    const totalLabCost = allChainVisits.reduce((sum, v) => sum + v.labRateAmount * v.labQuantity, 0);
    const minimumNeeded = doctorFee + totalLabCost;
    const shortfall = minimumNeeded - totalCollected;

    if (shortfall > 0) {
      chainWarnings.push({
        operationName: visit.operation?.name || "Treatment",
        doctorFee,
        labCost: totalLabCost,
        collected: totalCollected,
        shortfall,
      });
    }
  }

  // Recent receipts across all visits (last 10)
  const allReceipts = patient.visits.flatMap((visit) =>
    visit.receipts.map((r) => ({
      id: r.id,
      receiptNo: r.receiptNo,
      receiptDate: r.receiptDate.toISOString(),
      amount: r.amount,
      paymentMode: r.paymentMode,
      caseNo: visit.caseNo,
      operationName: visit.operation?.name || "Visit",
    }))
  );
  allReceipts.sort(
    (a, b) =>
      new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()
  );
  const recentReceipts = allReceipts.slice(0, 10);

  const totalOutstanding = outstandingVisits.reduce(
    (s, v) => s + v.balance,
    0
  );

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: "Patients", href: "/patients" },
          { label: patient.name, href: `/patients/${patient.id}` },
          { label: "Checkout" },
        ]} />
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-center">
            <div className="text-xs uppercase tracking-wide opacity-80">
              Bill Payment
            </div>
            <div className="text-2xl font-bold font-mono">#{patient.code}</div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {patient.salutation && `${patient.salutation}. `}
              {patient.name}
            </h2>
            <p className="text-muted-foreground">
              Outstanding: {"\u20B9"}
              {totalOutstanding.toLocaleString("en-IN")} across{" "}
              {outstandingVisits.length} {outstandingVisits.length === 1 ? "visit" : "visits"}
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
              {w.operationName}: ₹{w.collected.toLocaleString("en-IN")} collected, but doctor fee is ₹{w.doctorFee.toLocaleString("en-IN")}{w.labCost > 0 ? ` + lab ₹${w.labCost.toLocaleString("en-IN")}` : ""} — ₹{w.shortfall.toLocaleString("en-IN")} short
            </div>
          ))}
        </div>
      )}

      <CheckoutForm
        patientId={patient.id}
        patientCode={patient.code}
        patientName={patient.name}
        outstandingVisits={outstandingVisits}
        recentReceipts={recentReceipts}
      />
    </div>
  );
}
