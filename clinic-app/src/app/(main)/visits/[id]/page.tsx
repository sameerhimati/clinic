import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toTitleCase, formatDate, formatDateTime, getVisitLabel } from "@/lib/format";
import { IndianRupee, FileText, ClipboardPlus, GitBranch, Lock, MessageSquarePlus, CalendarDays, Check, ArrowRight, Circle, Wrench, Pill, Printer } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments, canSeeInternalCosts, isReportLocked } from "@/lib/permissions";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { FileUpload } from "@/components/file-upload";
import { FileGallery } from "@/components/file-gallery";
import { DetailRow } from "@/components/detail-row";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ToastOnParam } from "@/components/toast-on-param";
import { ConsultantQuickNote } from "@/components/consultant-quick-note";
import { getStatusLabel } from "@/lib/dental";

export const dynamic = "force-dynamic";

export default async function VisitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const currentUser = await requireAuth();
  const canCollect = canCollectPayments(currentUser.permissionLevel);
  const showInternalCosts = canSeeInternalCosts(currentUser.permissionLevel);
  const isDoctor = currentUser.permissionLevel >= 3;
  const { id } = await params;
  const { newVisit } = await searchParams;
  const visit = await prisma.visit.findUnique({
    where: { id: parseInt(id) },
    include: {
      patient: true,
      operation: true,
      doctor: true,
      assistingDoctor: true,
      lab: true,
      labRate: true,
      receipts: { orderBy: { receiptDate: "desc" } },
      clinicalReports: {
        include: {
          doctor: { select: { name: true } },
          addendums: {
            include: { doctor: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { reportDate: "desc" },
        take: 1,
      },
      files: {
        include: { uploadedBy: true },
        orderBy: { createdAt: "desc" },
      },
      parentVisit: {
        include: { operation: { select: { name: true } } },
      },
      followUps: {
        orderBy: { visitDate: "asc" },
        include: {
          operation: { select: { name: true } },
          doctor: { select: { name: true } },
        },
      },
    },
  });

  if (!visit) notFound();

  // Fetch treatment steps for the operation (if any)
  const treatmentSteps = visit.operationId
    ? await prisma.treatmentStep.findMany({
        where: { operationId: visit.operationId },
        orderBy: { stepNumber: "asc" },
        include: { defaultDoctor: { select: { name: true } } },
      })
    : [];

  // Get the root visit id for the treatment chain
  const rootVisitId = visit.parentVisitId || visit.id;

  // Fetch all visits in the chain (root + follow-ups) with cost data
  const chainVisits = treatmentSteps.length > 0
    ? await prisma.visit.findMany({
        where: {
          OR: [
            { id: rootVisitId },
            { parentVisitId: rootVisitId },
          ],
        },
        include: {
          doctor: { select: { name: true } },
          clinicalReports: { take: 1, select: { id: true } },
          receipts: { select: { amount: true } },
        },
        orderBy: { visitDate: "asc" },
      })
    : [];

  // Match chain visits to template steps
  const completedSteps = chainVisits.map((v) => ({
    visitId: v.id,
    stepLabel: v.stepLabel,
    visitDate: v.visitDate,
    doctorName: v.doctor?.name ? toTitleCase(v.doctor.name) : null,
    hasReport: v.clinicalReports.length > 0,
    billed: Math.max(0, ((v.operationRate || 0) - (v.discount || 0)) * (v.quantity ?? 1)),
    paid: v.receipts.reduce((s, r) => s + r.amount, 0),
  }));

  // Chain-level cost summary
  const chainTotalBilled = chainVisits.reduce((sum, v) => sum + Math.max(0, ((v.operationRate || 0) - (v.discount || 0)) * (v.quantity ?? 1)), 0);
  const chainTotalPaid = chainVisits.reduce((sum, v) => sum + v.receipts.reduce((s, r) => s + r.amount, 0), 0);
  const chainTotalDue = chainTotalBilled - chainTotalPaid;

  // Doctor fee for this operation
  const doctorFee = visit.operation?.doctorFee;

  // Current step index (which step in the chain is this visit?)
  const currentStepInChain = chainVisits.findIndex((v) => v.id === visit.id);
  const totalSteps = Math.max(treatmentSteps.length, chainVisits.length);

  // Find next unmatched step
  const nextStepIndex = completedSteps.length;
  const nextStep = treatmentSteps[nextStepIndex] || null;

  // Compute suggested date for next step
  let suggestedDate: string | null = null;
  if (nextStep && completedSteps.length > 0) {
    const lastVisit = completedSteps[completedSteps.length - 1];
    const lastDate = new Date(lastVisit.visitDate);
    const suggested = new Date(lastDate.getTime() + nextStep.defaultDayGap * 86400000);
    suggestedDate = `${suggested.getFullYear()}-${String(suggested.getMonth() + 1).padStart(2, "0")}-${String(suggested.getDate()).padStart(2, "0")}`;
  }

  // Check for active treatment plan for this patient
  const activePlan = await prisma.treatmentPlan.findFirst({
    where: {
      patientId: visit.patientId,
      status: "ACTIVE",
      items: {
        some: {
          OR: [
            { visitId: visit.id }, // this visit is linked to a plan item
            { visitId: null },     // plan has uncompleted items
          ],
        },
      },
    },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          operation: { select: { name: true } },
          assignedDoctor: { select: { name: true } },
          visit: { select: { id: true, visitDate: true } },
        },
      },
    },
  });

  // Compute plan-based next step
  let planNextItem: { id: number; label: string; assignedDoctorId: number | null; estimatedDate: string | null } | null = null;
  if (activePlan) {
    const planItems = activePlan.items;
    const nextIdx = planItems.findIndex((i) => i.visitId === null);
    if (nextIdx >= 0) {
      const next = planItems[nextIdx];
      // Estimate date from last completed item
      let estDate: string | null = null;
      for (let i = nextIdx - 1; i >= 0; i--) {
        if (planItems[i].visit?.visitDate) {
          const lastDate = new Date(planItems[i].visit!.visitDate);
          let totalDays = 0;
          for (let j = i + 1; j <= nextIdx; j++) {
            totalDays += planItems[j].estimatedDayGap;
          }
          const suggested = new Date(lastDate.getTime() + totalDays * 86400000);
          estDate = `${suggested.getFullYear()}-${String(suggested.getMonth() + 1).padStart(2, "0")}-${String(suggested.getDate()).padStart(2, "0")}`;
          break;
        }
      }
      planNextItem = {
        id: next.id,
        label: next.label,
        assignedDoctorId: next.assignedDoctorId,
        estimatedDate: estDate,
      };
    }
  }

  // Fetch work done entries for this visit
  const workDoneEntries = await prisma.workDone.findMany({
    where: { visitId: visit.id },
    include: {
      operation: { select: { name: true } },
      performedBy: { select: { name: true } },
      planItem: { select: { label: true } },
      fulfillment: { select: { id: true, amount: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Fetch prescriptions for this visit
  const prescriptions = await prisma.prescription.findMany({
    where: { visitId: visit.id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      doctor: { select: { name: true } },
      printedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const billed = calcBilled(visit);
  const paid = calcPaid(visit.receipts);
  const balance = calcBalance(visit, visit.receipts);
  const clinicalReport = visit.clinicalReports[0] || null;
  const hasReceipts = visit.receipts.length > 0;
  const reportLocked = clinicalReport ? isReportLocked(clinicalReport) : false;

  // Visit type badge color
  const typeBadge = {
    NEW: { label: "New", variant: "secondary" as const },
    FOLLOWUP: { label: "Follow-up", variant: "outline" as const },
    REVIEW: { label: "Review", variant: "outline" as const },
  }[visit.visitType] || { label: visit.visitType, variant: "secondary" as const };

  return (
    <div className="max-w-3xl space-y-6">
      <ToastOnParam param="newVisit" message="Visit created" />
      <Breadcrumbs items={[
        { label: "Patients", href: "/patients" },
        { label: toTitleCase(visit.patient.name), href: `/patients/${visit.patientId}` },
        { label: `Case #${visit.caseNo || visit.id}` },
      ]} />
      {/* Post-create CTA */}
      {newVisit === "1" && !clinicalReport && isDoctor && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              Visit created — add clinical notes?
            </div>
            <Button size="sm" asChild>
              <Link href={`/visits/${visit.id}/examine`}>
                <ClipboardPlus className="mr-1 h-3.5 w-3.5" />
                Add Notes
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Case #{visit.caseNo || visit.id}
            <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
            {treatmentSteps.length > 0 && currentStepInChain >= 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                Step {currentStepInChain + 1} of {totalSteps}
              </span>
            )}
          </h2>
          <p className="text-muted-foreground">
            <Link href={`/patients/${visit.patientId}`} className="hover:underline font-medium">
              #{visit.patient.code} {visit.patient.salutation && `${visit.patient.salutation}. `}{toTitleCase(visit.patient.name)}
            </Link>
            {" \u00b7 "}
            {formatDate(visit.visitDate)}
          </p>
          {/* Step label */}
          {visit.stepLabel && (
            <p className="text-sm mt-0.5 font-medium text-primary">{visit.stepLabel}</p>
          )}
          {/* Follow-up reason badge */}
          {visit.followUpReason && (
            <Badge
              variant="outline"
              className={`mt-1 text-xs ${
                visit.followUpReason === "REDO" ? "bg-amber-100 text-amber-700 border-amber-200" :
                visit.followUpReason === "COMPLICATION" ? "bg-red-100 text-red-700 border-red-200" :
                visit.followUpReason === "ADJUSTMENT" ? "bg-blue-100 text-blue-700 border-blue-200" : ""
              }`}
            >
              {visit.followUpReason === "REDO" ? "Warranty Redo" :
               visit.followUpReason === "COMPLICATION" ? "Complication" :
               visit.followUpReason === "ADJUSTMENT" ? "Adjustment" : visit.followUpReason}
            </Badge>
          )}
          {/* Parent visit link */}
          {visit.parentVisit && (
            <p className="text-sm mt-1">
              <GitBranch className="h-3.5 w-3.5 inline mr-1" />
              Follow-up of{" "}
              <Link href={`/visits/${visit.parentVisit.id}`} className="hover:underline text-primary">
                Case #{visit.parentVisit.caseNo} — {visit.parentVisit.operation?.name || visit.customLabel || "Visit"}
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {/* Next Step — info badge for doctors */}
          {isDoctor && (planNextItem || nextStep) && (
            <Badge variant="secondary">
              Next: {planNextItem ? planNextItem.label : nextStep!.name}
            </Badge>
          )}
          {/* Schedule Follow-up — reception/admin only */}
          {!isDoctor && (
            <Button variant="outline" size="sm" asChild>
              <Link href={planNextItem
                ? `/appointments/new?patientId=${visit.patientId}&visitId=${visit.id}${planNextItem.assignedDoctorId ? `&doctorId=${planNextItem.assignedDoctorId}` : visit.doctorId ? `&doctorId=${visit.doctorId}` : ""}&reason=${encodeURIComponent(planNextItem.label)}&planItemId=${planNextItem.id}${planNextItem.estimatedDate ? `&date=${planNextItem.estimatedDate}` : ""}`
                : `/appointments/new?patientId=${visit.patientId}&visitId=${visit.id}${nextStep?.defaultDoctorId ? `&doctorId=${nextStep.defaultDoctorId}` : visit.doctorId ? `&doctorId=${visit.doctorId}` : ""}${suggestedDate ? `&date=${suggestedDate}` : ""}${nextStep ? `&reason=${encodeURIComponent(nextStep.name)}` : ""}`
              }>
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                {planNextItem ? `Schedule: ${planNextItem.label}` : nextStep ? `Schedule: ${nextStep.name}` : "Schedule F/U"}
              </Link>
            </Button>
          )}
          {isDoctor ? (
            <Button variant={clinicalReport ? "outline" : "default"} size="sm" asChild>
              <Link href={`/visits/${visit.id}/examine`}>
                {clinicalReport ? (
                  reportLocked ? (
                    <><MessageSquarePlus className="mr-2 h-4 w-4" />Add Note</>
                  ) : (
                    <><FileText className="mr-2 h-4 w-4" />Edit Notes</>
                  )
                ) : (
                  <><ClipboardPlus className="mr-2 h-4 w-4" />Add Notes</>
                )}
              </Link>
            </Button>
          ) : clinicalReport ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/visits/${visit.id}/examine`}>
                <FileText className="mr-2 h-4 w-4" />View Notes
              </Link>
            </Button>
          ) : null}
          {canCollect && balance > 0 && (
            <Button size="sm" asChild>
              <Link href={`/patients/${visit.patientId}/checkout`}>
                <IndianRupee className="mr-2 h-4 w-4" /> Collect
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Visit lock indicator */}
      {hasReceipts && !isDoctor && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Lock className="h-4 w-4" />
            <span>Visit details locked — payment received</span>
          </div>
        </div>
      )}

      {/* Follow-ups list */}
      {visit.followUps.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Follow-up Visits</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {visit.followUps.map((fu, i) => (
                <Link key={fu.id} href={`/visits/${fu.id}`} className="flex items-center justify-between p-3 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{i === visit.followUps.length - 1 ? "\u2514\u2500\u2500" : "\u251C\u2500\u2500"}</span>
                    <span>{formatDate(fu.visitDate)}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="font-medium">{fu.operation?.name || fu.customLabel || "Visit"}</span>
                    {fu.doctor && <span className="text-muted-foreground">\u00b7 Dr. {toTitleCase(fu.doctor.name)}</span>}
                  </div>
                  <Badge variant="outline" className="text-xs">View</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Treatment Progress — shown when operation has treatment steps */}
      {treatmentSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{visit.operation?.name} — Treatment Progress</span>
              <span className="text-sm font-normal text-muted-foreground">
                {completedSteps.length} of {treatmentSteps.length} steps
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {treatmentSteps.map((step, i) => {
              const matchedVisit = completedSteps[i];
              const isCurrent = i === nextStepIndex - 1 && matchedVisit?.visitId === visit.id;
              const isCompleted = i < completedSteps.length;
              const isNext = i === nextStepIndex;

              return (
                <div key={step.id} className="flex items-start gap-3 text-sm">
                  <div className="shrink-0 mt-0.5">
                    {isCompleted ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : isNext ? (
                      <ArrowRight className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isCompleted ? "text-foreground" : isNext ? "text-primary" : "text-muted-foreground"}`}>
                        Step {step.stepNumber}: {step.name}
                      </span>
                      {matchedVisit && !isDoctor && matchedVisit.billed > 0 && (
                        <span className="text-xs font-mono text-muted-foreground">
                          ₹{matchedVisit.billed.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    {matchedVisit && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(matchedVisit.visitDate)}{matchedVisit.doctorName ? ` · Dr. ${matchedVisit.doctorName}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Chain cost summary — visible to reception/admin */}
            {!isDoctor && chainVisits.length > 0 && (
              <div className="pt-3 border-t mt-3 flex flex-wrap gap-4 text-xs">
                <span>Billed: <span className="font-medium">₹{chainTotalBilled.toLocaleString("en-IN")}</span></span>
                <span className="text-green-600">Paid: <span className="font-medium">₹{chainTotalPaid.toLocaleString("en-IN")}</span></span>
                {chainTotalDue > 0 && (
                  <span className="text-destructive">Due: <span className="font-medium">₹{chainTotalDue.toLocaleString("en-IN")}</span></span>
                )}
                {doctorFee != null && doctorFee > 0 && showInternalCosts && (
                  <span className="text-muted-foreground">Doctor fee: <span className="font-medium">₹{doctorFee.toLocaleString("en-IN")}</span></span>
                )}
              </div>
            )}

            {/* Schedule next step button — plan-aware, hidden for doctors */}
            {!isDoctor && (planNextItem || nextStep) && (
              <div className="pt-3 border-t mt-3">
                <Button size="sm" asChild>
                  <Link href={planNextItem
                    ? `/appointments/new?patientId=${visit.patientId}${planNextItem.assignedDoctorId ? `&doctorId=${planNextItem.assignedDoctorId}` : visit.doctorId ? `&doctorId=${visit.doctorId}` : ""}&reason=${encodeURIComponent(planNextItem.label)}&planItemId=${planNextItem.id}${planNextItem.estimatedDate ? `&date=${planNextItem.estimatedDate}` : ""}`
                    : `/appointments/new?patientId=${visit.patientId}${visit.doctorId ? `&doctorId=${visit.doctorId}` : ""}&reason=${encodeURIComponent(nextStep!.name)}&stepLabel=${encodeURIComponent(nextStep!.name)}${suggestedDate ? `&date=${suggestedDate}` : ""}`
                  }>
                    <CalendarDays className="mr-1 h-3.5 w-3.5" />
                    {planNextItem
                      ? `Schedule: ${planNextItem.label}`
                      : `Schedule Step ${nextStep!.stepNumber}: ${nextStep!.name}`
                    }
                    {(planNextItem?.estimatedDate || suggestedDate) && (
                      <span className="text-xs ml-1 opacity-70">
                        (suggested: {formatDate((planNextItem?.estimatedDate || suggestedDate)!)})
                      </span>
                    )}
                  </Link>
                </Button>
              </div>
            )}

            {/* All steps complete */}
            {!nextStep && completedSteps.length >= treatmentSteps.length && (
              <div className="pt-3 border-t mt-3 text-sm text-green-700 font-medium">
                All treatment steps completed
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing Summary — compact pills, hidden for doctors */}
      {!isDoctor && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">
            Billed: {"\u20B9"}{billed.toLocaleString("en-IN")}
            {(visit.discount > 0 || (visit.quantity ?? 1) > 1) && (
              <span className="text-muted-foreground ml-1">
                ({"\u20B9"}{(visit.operationRate || 0).toLocaleString("en-IN")}
                {visit.discount > 0 && <> - {"\u20B9"}{visit.discount.toLocaleString("en-IN")} disc.</>}
                {(visit.quantity ?? 1) > 1 && <> ×{visit.quantity}</>})
              </span>
            )}
          </span>
          <span className="text-muted-foreground">{"\u00b7"}</span>
          <span className="text-green-600 font-medium">Paid: {"\u20B9"}{paid.toLocaleString("en-IN")}</span>
          <span className="text-muted-foreground">{"\u00b7"}</span>
          <span className={`font-medium ${balance > 0 ? "text-destructive" : ""}`}>
            Balance: {"\u20B9"}{balance.toLocaleString("en-IN")}
          </span>
        </div>
      )}

      {/* Clinical Report */}
      {clinicalReport && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Clinical Notes</CardTitle>
              {reportLocked && (
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/visits/${visit.id}/examine/print`}>Print</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {clinicalReport.complaint && (
              <div><div className="text-muted-foreground font-medium">Complaint</div><div className="mt-0.5 whitespace-pre-wrap">{clinicalReport.complaint}</div></div>
            )}
            {clinicalReport.diagnosis && (
              <div><div className="text-muted-foreground font-medium">Diagnosis</div><div className="mt-0.5 whitespace-pre-wrap">{clinicalReport.diagnosis}</div></div>
            )}
            {clinicalReport.treatmentNotes && (
              <div><div className="text-muted-foreground font-medium">Treatment Plan</div><div className="mt-0.5 whitespace-pre-wrap">{clinicalReport.treatmentNotes}</div></div>
            )}
            {clinicalReport.medication && (
              <div><div className="text-muted-foreground font-medium">Medication</div><div className="mt-0.5 whitespace-pre-wrap">{clinicalReport.medication}</div></div>
            )}
            <div className="text-xs text-muted-foreground pt-1">
              By Dr. {toTitleCase(clinicalReport.doctor.name)} {"\u00b7"} {formatDate(clinicalReport.reportDate)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Addendums */}
      {clinicalReport && clinicalReport.addendums.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Additional Notes ({clinicalReport.addendums.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clinicalReport.addendums.map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">
                <div className="whitespace-pre-wrap">{a.content}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Dr. {toTitleCase(a.doctor.name)} {"\u00b7"} {formatDateTime(a.createdAt)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Work Done */}
      {workDoneEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Work Done ({workDoneEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workDoneEntries.map((wd) => (
              <div key={wd.id} className="flex items-start gap-2 text-sm rounded-md border p-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{wd.operation.name}</span>
                    {wd.toothNumber && (
                      <span className="text-xs text-muted-foreground">Tooth {wd.toothNumber}</span>
                    )}
                    {wd.resultingStatus && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        → {getStatusLabel(wd.resultingStatus)}
                      </Badge>
                    )}
                    {wd.planItem && (
                      <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0 inline-flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {wd.planItem.label}
                      </span>
                    )}
                    {wd.fulfillment && !isDoctor && (
                      <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0">
                        Escrow: {"\u20B9"}{wd.fulfillment.amount.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  {wd.notes && <p className="text-xs text-muted-foreground mt-1">{wd.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dr. {toTitleCase(wd.performedBy.name)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Prescriptions */}
      {prescriptions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Prescriptions ({prescriptions.length})
            </CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/visits/${visit.id}/prescription`}>
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Dr. {toTitleCase(rx.doctor.name)} · {formatDateTime(rx.createdAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    {rx.isPrinted ? (
                      <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">Printed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Pending</Badge>
                    )}
                    <Link
                      href={`/visits/${visit.id}/prescription/print?rxId=${rx.id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Printer className="h-3 w-3" />
                      Print
                    </Link>
                  </div>
                </div>
                <div className="text-sm space-y-0.5">
                  {rx.items.map((item) => (
                    <div key={item.id}>
                      <span className="font-medium">{item.drug}</span>
                      {item.frequency && <span className="text-muted-foreground ml-1">{item.frequency}</span>}
                      {item.duration && <span className="text-muted-foreground ml-1">× {item.duration}</span>}
                    </div>
                  ))}
                </div>
                {rx.notes && <p className="text-xs text-muted-foreground">{rx.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* L4 Consultant Quick Note */}
      {currentUser.permissionLevel === 4 && clinicalReport && (
        <ConsultantQuickNote visitId={visit.id} />
      )}

      {/* Visit Details — only fields not in header */}
      {(visit.stepLabel || visit.assistingDoctor || (showInternalCosts && visit.doctorCommissionPercent != null) || (!isDoctor && (visit.lab || visit.labRate)) || visit.notes) && (
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {visit.stepLabel && <DetailRow label="Step" value={visit.stepLabel} />}
            {visit.assistingDoctor && <DetailRow label="Assisting Doctor" value={visit.assistingDoctor.name} />}
            {showInternalCosts && visit.doctorCommissionPercent != null && (
              <DetailRow label="Commission %" value={`${visit.doctorCommissionPercent}%`} />
            )}
            {!isDoctor && (visit.lab || visit.labRate) && (
              <>
                <Separator />
                {visit.lab && <DetailRow label="Lab" value={visit.lab.name} />}
                {visit.labRate && <DetailRow label="Lab Item" value={visit.labRate.itemName} />}
                {showInternalCosts && visit.labRateAmount > 0 && (
                  <DetailRow label="Lab Rate" value={`\u20B9${visit.labRateAmount.toLocaleString("en-IN")} \u00d7 ${visit.labQuantity}`} />
                )}
              </>
            )}
            {visit.notes && (
              <>
                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground">Notes</div>
                  <div className="mt-1 whitespace-pre-wrap">{visit.notes}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Files */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Files ({visit.files.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload patientId={visit.patientId} visitId={visit.id} />
          <FileGallery files={visit.files} canDelete={currentUser.permissionLevel <= 2} />
        </CardContent>
      </Card>

      {/* Receipts — hidden for doctors */}
      {!isDoctor && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Receipts ({visit.receipts.length})</CardTitle>
            {canCollect && balance > 0 && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/patients/${visit.patientId}/checkout`}>
                  <IndianRupee className="mr-2 h-4 w-4" /> Collect
                </Link>
              </Button>
            )}
          </CardHeader>
            <CardContent>
              <div className="divide-y">
                {visit.receipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {receipt.receiptNo && <span className="font-mono text-sm text-muted-foreground">Rcpt #{receipt.receiptNo}</span>}
                        {"\u20B9"}{receipt.amount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-sm text-muted-foreground">{formatDate(receipt.receiptDate)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{receipt.paymentMode}</Badge>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/receipts/${receipt.id}/print`}>Print</Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {visit.receipts.length === 0 && (
                  <div className="py-4 text-center text-muted-foreground">No payments yet</div>
                )}
              </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

// DetailRow imported from @/components/detail-row
