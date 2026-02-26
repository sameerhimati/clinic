import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { IndianRupee, FileText, ClipboardPlus, GitBranch, Lock, MessageSquarePlus, CalendarDays, ChevronRight } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments, canSeeInternalCosts, isReportLocked } from "@/lib/permissions";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { FileUpload } from "@/components/file-upload";
import { FileGallery } from "@/components/file-gallery";
import { DetailRow } from "@/components/detail-row";
import { Breadcrumbs } from "@/components/breadcrumbs";

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
  const isDoctor = currentUser.permissionLevel === 3;
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
      <Breadcrumbs items={[
        { label: "Patients", href: "/patients" },
        { label: visit.patient.name, href: `/patients/${visit.patientId}` },
        { label: `Case #${visit.caseNo || visit.id}` },
      ]} />
      {/* Post-create CTA */}
      {newVisit === "1" && !clinicalReport && (
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
          </h2>
          <p className="text-muted-foreground">
            <Link href={`/patients/${visit.patientId}`} className="hover:underline font-medium">
              #{visit.patient.code} {visit.patient.salutation && `${visit.patient.salutation}. `}{visit.patient.name}
            </Link>
            {" \u00b7 "}
            {format(new Date(visit.visitDate), "MMMM d, yyyy")}
          </p>
          {/* Step label */}
          {visit.stepLabel && (
            <p className="text-sm mt-0.5 font-medium text-primary">{visit.stepLabel}</p>
          )}
          {/* Parent visit link */}
          {visit.parentVisit && (
            <p className="text-sm mt-1">
              <GitBranch className="h-3.5 w-3.5 inline mr-1" />
              Follow-up of{" "}
              <Link href={`/visits/${visit.parentVisit.id}`} className="hover:underline text-primary">
                Case #{visit.parentVisit.caseNo} — {visit.parentVisit.operation?.name || "Visit"}
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {/* Next Step — for doctors to create follow-up visits */}
          {isDoctor && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/visits/new?patientId=${visit.patientId}&followUp=${visit.id}&doctorId=${currentUser.id}`}>
                Next Step
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          {/* Schedule Follow-up — reception/admin only */}
          {!isDoctor && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/appointments/new?patientId=${visit.patientId}&visitId=${visit.id}${visit.doctorId ? `&doctorId=${visit.doctorId}` : ""}`}>
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                Schedule F/U
              </Link>
            </Button>
          )}
          <Button variant={clinicalReport ? "outline" : "default"} size="sm" asChild>
            <Link href={`/visits/${visit.id}/examine`}>
              {clinicalReport ? (
                reportLocked ? (
                  <><MessageSquarePlus className="mr-2 h-4 w-4" />Add Addendum</>
                ) : (
                  <><FileText className="mr-2 h-4 w-4" />Edit Notes</>
                )
              ) : (
                <><ClipboardPlus className="mr-2 h-4 w-4" />Add Notes</>
              )}
            </Link>
          </Button>
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
                    <span>{format(new Date(fu.visitDate), "MMM d, yyyy")}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="font-medium">{fu.operation?.name || "Visit"}</span>
                    {fu.doctor && <span className="text-muted-foreground">\u00b7 Dr. {fu.doctor.name}</span>}
                  </div>
                  <Badge variant="outline" className="text-xs">View</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Summary — compact pills, hidden for doctors */}
      {!isDoctor && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">
            Billed: {"\u20B9"}{billed.toLocaleString("en-IN")}
            {visit.discount > 0 && (
              <span className="text-muted-foreground ml-1">
                ({"\u20B9"}{(visit.operationRate || 0).toLocaleString("en-IN")} - {"\u20B9"}{visit.discount.toLocaleString("en-IN")} disc.)
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
              By Dr. {clinicalReport.doctor.name} {"\u00b7"} {format(new Date(clinicalReport.reportDate), "MMM d, yyyy")}
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
              Addendums ({clinicalReport.addendums.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clinicalReport.addendums.map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">
                <div className="whitespace-pre-wrap">{a.content}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Dr. {a.doctor.name} {"\u00b7"} {format(new Date(a.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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
                      <div className="text-sm text-muted-foreground">{format(new Date(receipt.receiptDate), "MMM d, yyyy")}</div>
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
