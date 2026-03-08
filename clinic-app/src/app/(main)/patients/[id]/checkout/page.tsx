import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EscrowCheckout } from "./escrow-checkout";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { toTitleCase, getVisitLabel, formatDate } from "@/lib/format";
import { getEscrowSummary } from "@/lib/escrow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Wrench, CalendarDays, ArrowRight, AlertTriangle } from "lucide-react";

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
      diseases: { include: { disease: { select: { name: true } } } },
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

  // Today's work done — most recent visit with WorkDone entries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayWorkDone = await prisma.workDone.findMany({
    where: {
      visit: { patientId: patientId, visitDate: { gte: today, lt: tomorrow } },
    },
    include: {
      operation: { select: { name: true } },
      performedBy: { select: { name: true } },
      visit: { select: { id: true, caseNo: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Active treatment plan with next steps
  const activePlans = await prisma.treatmentPlan.findMany({
    where: { patientId, status: "ACTIVE" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          sortOrder: true,
          visitId: true,
          completedAt: true,
          estimatedDayGap: true,
          assignedDoctorId: true,
          operation: { select: { name: true, defaultMaxFee: true, doctorFee: true, labCostEstimate: true } },
        },
      },
    },
  });

  // Find next uncompleted step across all active plans
  const nextSteps: { planTitle: string; planId: number; stepLabel: string; estimatedDayGap: number; lastCompletedDate: Date | null; operationName: string | null; estimatedCost: number | null; doctorFee: number | null; labCost: number | null; planItemId: number; assignedDoctorId: number | null }[] = [];
  let totalRemainingCost = 0;
  for (const plan of activePlans) {
    const items = plan.items.sort((a, b) => a.sortOrder - b.sortOrder);
    let lastCompleted: Date | null = null;
    let nextItem: typeof items[0] | null = null;
    for (const item of items) {
      if (item.completedAt) {
        lastCompleted = item.completedAt;
      } else {
        if (!nextItem) nextItem = item;
        // Sum up remaining cost estimates
        if (item.operation?.defaultMaxFee) totalRemainingCost += item.operation.defaultMaxFee;
      }
    }
    if (nextItem) {
      const op = nextItem.operation;
      const doctorFee = op?.doctorFee || null;
      const labCost = op?.labCostEstimate || null;
      const estimatedCost = op?.defaultMaxFee || null;
      nextSteps.push({
        planTitle: plan.title,
        planId: plan.id,
        stepLabel: nextItem.label,
        estimatedDayGap: nextItem.estimatedDayGap,
        lastCompletedDate: lastCompleted,
        operationName: op?.name || null,
        estimatedCost,
        doctorFee,
        labCost,
        planItemId: nextItem.id,
        assignedDoctorId: nextItem.assignedDoctorId,
      });
    }
  }

  // Smart minimum calculation
  const nextProcedureCost = nextSteps.reduce((sum, s) => sum + (s.doctorFee || 0) + (s.labCost || 0), 0);
  const shortfall = nextProcedureCost > 0 ? Math.max(0, nextProcedureCost - escrow.balance) : 0;

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
              Account Balance: {"\u20B9"}
              {escrowData.balance.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Medical alerts */}
      {patient.diseases.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="text-sm font-semibold text-red-800">Medical Alert</span>
            <div className="flex flex-wrap gap-1.5 ml-1">
              {patient.diseases.map((d) => (
                <span key={d.diseaseId} className="inline-flex items-center rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-800">
                  {d.disease.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* What was done today */}
      {todayWorkDone.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Done Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {todayWorkDone.map((wd) => (
                <div key={wd.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium text-sm">{wd.operation.name}</span>
                    {wd.toothNumber && (
                      <span className="text-xs text-muted-foreground ml-1.5">Tooth #{wd.toothNumber}</span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Dr. {toTitleCase(wd.performedBy.name)}
                      {wd.visit.caseNo && (
                        <Link href={`/visits/${wd.visit.id}`} className="text-primary hover:underline ml-1.5">
                          Case #{wd.visit.caseNo}
                        </Link>
                      )}
                    </div>
                  </div>
                  {wd.resultingStatus && (
                    <Badge variant="outline" className="text-xs">
                      {"\u2192"} {wd.resultingStatus}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps — active treatment plans with cost estimates + consolidated alerts */}
      {nextSteps.length > 0 && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-blue-600" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <div className="divide-y divide-blue-200">
              {nextSteps.map((step) => {
                const estimatedDate = step.lastCompletedDate
                  ? new Date(step.lastCompletedDate.getTime() + step.estimatedDayGap * 24 * 60 * 60 * 1000)
                  : null;
                return (
                  <div key={step.planId} className="flex items-center justify-between py-2.5 gap-3">
                    <div>
                      <div className="font-medium text-sm">
                        {step.stepLabel}
                        {step.estimatedCost && (
                          <span className="text-muted-foreground font-normal"> — ~{"\u20B9"}{step.estimatedCost.toLocaleString("en-IN")}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {step.planTitle}
                        {estimatedDate && (
                          <span> · Due ~{formatDate(estimatedDate)}</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="default" asChild>
                      <Link href={`/appointments/new?patientId=${patientId}${step.assignedDoctorId ? `&doctorId=${step.assignedDoctorId}` : ''}&reason=${encodeURIComponent(step.stepLabel)}&planItemId=${step.planItemId}`}>
                        <CalendarDays className="mr-1 h-3.5 w-3.5" />
                        Schedule F/U
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
            {totalRemainingCost > 0 && (
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-blue-200">
                Estimated remaining treatment: {"\u20B9"}{totalRemainingCost.toLocaleString("en-IN")}
              </div>
            )}

            {/* Consolidated financial alerts inside next steps card */}
            {(nextProcedureCost > 0 || chainWarnings.length > 0) && (
              <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
                {nextProcedureCost > 0 && shortfall > 0 && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    <span className="font-medium">Minimum needed:</span>{" "}
                    {nextSteps.map((s) => s.stepLabel).join(", ")}
                    {nextSteps[0].doctorFee && (
                      <span> — Doctor fee {"\u20B9"}{nextSteps[0].doctorFee.toLocaleString("en-IN")}</span>
                    )}
                    {nextSteps[0].labCost ? ` + Lab est. \u20B9${nextSteps[0].labCost.toLocaleString("en-IN")}` : ""}
                    {" = "}<span className="font-bold">{"\u20B9"}{nextProcedureCost.toLocaleString("en-IN")}</span>
                    <div className="text-amber-700 mt-0.5">
                      Balance: {"\u20B9"}{escrow.balance.toLocaleString("en-IN")} → <span className="font-semibold">Collect {"\u20B9"}{shortfall.toLocaleString("en-IN")} more</span>
                    </div>
                  </div>
                )}
                {nextProcedureCost > 0 && shortfall <= 0 && (
                  <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm font-medium text-green-800">
                    Sufficient balance for next procedure ({"\u20B9"}{nextProcedureCost.toLocaleString("en-IN")} needed, {"\u20B9"}{escrow.balance.toLocaleString("en-IN")} available)
                  </div>
                )}
                {chainWarnings.map((w, i) => (
                  <div key={i} className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                    <span className="font-medium text-amber-800">{w.operationName}:</span> {"\u20B9"}{w.collected.toLocaleString("en-IN")} collected, doctor fee {"\u20B9"}{w.doctorFee.toLocaleString("en-IN")}{w.labCost > 0 ? ` + lab \u20B9${w.labCost.toLocaleString("en-IN")}` : ""} — <span className="font-semibold">{"\u20B9"}{w.shortfall.toLocaleString("en-IN")} short</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Standalone alerts when no next steps */}
      {nextSteps.length === 0 && escrowData.balance < 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-800">
            Patient owes {"\u20B9"}{Math.abs(escrowData.balance).toLocaleString("en-IN")} — collect before scheduling follow-up
          </div>
        </div>
      )}

      {nextSteps.length === 0 && chainWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="text-sm font-medium text-amber-800">Collection Warning</div>
          {chainWarnings.map((w, i) => (
            <div key={i} className="text-sm text-amber-700">
              {w.operationName}: {"\u20B9"}{w.collected.toLocaleString("en-IN")} collected, but doctor fee is {"\u20B9"}{w.doctorFee.toLocaleString("en-IN")}{w.labCost > 0 ? ` + lab \u20B9${w.labCost.toLocaleString("en-IN")}` : ""} — {"\u20B9"}{w.shortfall.toLocaleString("en-IN")} short
            </div>
          ))}
        </div>
      )}

      {/* Collect Payment (primary) */}
      <EscrowCheckout
        patientId={patient.id}
        escrow={escrowData}
        suggestedAmount={shortfall > 0 ? shortfall : undefined}
      />

      {/* Legacy outstanding info — included in escrow balance */}
      {outstandingVisits.length > 0 && totalOutstanding > 0 && (
        <div className="rounded-lg border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
          This patient has {"\u20B9"}{totalOutstanding.toLocaleString("en-IN")} in legacy outstanding balances from {outstandingVisits.length} visit{outstandingVisits.length !== 1 ? "s" : ""}. These are reflected in the account balance above.
        </div>
      )}
    </div>
  );
}
