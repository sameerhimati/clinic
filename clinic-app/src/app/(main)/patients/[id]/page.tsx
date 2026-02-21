import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Edit, Plus, IndianRupee, AlertTriangle, Paperclip, Calendar } from "lucide-react";
import { DeletePatientButton } from "./delete-button";
import { requireAuth } from "@/lib/auth";
import { canSeePayments, canEditPatients } from "@/lib/permissions";
import { FileUpload } from "@/components/file-upload";
import { FileGallery } from "@/components/file-gallery";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = parseInt(id);
  const currentUser = await requireAuth();
  const showPayments = canSeePayments(currentUser.permissionLevel);
  const isDoctor = currentUser.permissionLevel === 3;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      diseases: {
        include: { disease: true },
      },
      visits: {
        orderBy: { visitDate: "desc" },
        include: {
          operation: { select: { name: true } },
          doctor: { select: { name: true } },
          receipts: { select: { id: true, receiptNo: true, amount: true, paymentMode: true, receiptDate: true } },
          clinicalReports: {
            select: {
              id: true,
              complaint: true,
              examination: true,
              diagnosis: true,
              treatmentNotes: true,
              medication: true,
              estimate: true,
              reportDate: true,
              createdAt: true,
              updatedAt: true,
              doctor: { select: { name: true } },
            },
            orderBy: { reportDate: "desc" },
            take: 1,
          },
          files: {
            include: { uploadedBy: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      files: {
        include: {
          uploadedBy: true,
          visit: { include: { operation: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!patient) notFound();

  // Calculate totals
  let totalBilled = 0;
  let totalPaid = 0;
  for (const visit of patient.visits) {
    totalBilled += (visit.operationRate || 0) - visit.discount;
    totalPaid += visit.receipts.reduce((s, r) => s + r.amount, 0);
  }
  const totalBalance = totalBilled - totalPaid;

  // Gather clinical reports for Clinical tab
  const clinicalReports = patient.visits
    .filter((v) => v.clinicalReports.length > 0)
    .map((v) => ({
      visitId: v.id,
      caseNo: v.caseNo,
      operationName: v.operation?.name || "Visit",
      report: v.clinicalReports[0],
    }));

  // Visit stats for header
  const visitCount = patient.visits.length;
  const firstVisit = patient.visits.length > 0 ? patient.visits[patient.visits.length - 1].visitDate : null;
  const lastVisit = patient.visits.length > 0 ? patient.visits[0].visitDate : null;

  // Calculate age
  let ageDisplay: string | null = null;
  if (patient.dateOfBirth) {
    const now = new Date();
    const dob = new Date(patient.dateOfBirth);
    let age = now.getFullYear() - dob.getFullYear();
    if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) {
      age--;
    }
    ageDisplay = `${age} yrs (DOB: ${format(dob, "dd MMM yyyy")})`;
  } else if (patient.ageAtRegistration) {
    const regDate = new Date(patient.createdAt);
    const yearsSinceReg = new Date().getFullYear() - regDate.getFullYear();
    const estimatedAge = patient.ageAtRegistration + yearsSinceReg;
    ageDisplay = `~${estimatedAge} yrs`;
  }

  // Default tab based on role
  const defaultTab = isDoctor ? "clinical-summary" : "info";

  return (
    <div className="space-y-6">
      {/* Patient Header — Medical Summary Bar */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-center">
            <div className="text-xs uppercase tracking-wide opacity-80">Patient</div>
            <div className="text-2xl font-bold font-mono">#{patient.code}</div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {patient.salutation && `${patient.salutation}. `}
              {patient.name}
            </h2>
            <p className="text-muted-foreground text-sm">
              {ageDisplay && <span>{ageDisplay}</span>}
              {patient.gender && <span> · {patient.gender === "M" ? "Male" : "Female"}</span>}
              {patient.bloodGroup && <span> · Blood: {patient.bloodGroup}</span>}
              {patient.mobile && <span> · {patient.mobile}</span>}
              {patient.phone && !patient.mobile && <span> · {patient.phone}</span>}
            </p>
            {patient.diseases.length > 0 && (
              <p className="text-sm mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-destructive font-medium">Medical:</span>
                <span className="text-muted-foreground">
                  {patient.diseases.map((pd) => pd.disease.name).join(", ")}
                </span>
              </p>
            )}
            {visitCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Total visits: {visitCount}
                {firstVisit && <span> · First: {format(new Date(firstVisit), "MMM yyyy")}</span>}
                {lastVisit && <span> · Last: {format(new Date(lastVisit), "MMM d, yyyy")}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {showPayments && totalBalance > 0 && (
            <Button asChild>
              <Link href={`/patients/${patient.id}/checkout`}>
                <IndianRupee className="mr-2 h-4 w-4" />
                Collect Payment
              </Link>
            </Button>
          )}
          {canEditPatients(currentUser.permissionLevel) && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/patients/${patient.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <DeletePatientButton patientId={patient.id} patientName={patient.name} />
            </>
          )}
        </div>
      </div>

      {/* Summary Cards — only for payment-visible roles */}
      {showPayments && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Billed</div>
              <div className="text-2xl font-bold">{"\u20B9"}{totalBilled.toLocaleString("en-IN")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-2xl font-bold text-green-600">{"\u20B9"}{totalPaid.toLocaleString("en-IN")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Balance</div>
              <div className={`text-2xl font-bold ${totalBalance > 0 ? "text-destructive" : ""}`}>
                {"\u20B9"}{totalBalance.toLocaleString("en-IN")}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Role-aware Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {isDoctor ? (
            <>
              <TabsTrigger value="clinical-summary">Clinical Summary</TabsTrigger>
              <TabsTrigger value="files">Files & Images ({patient.files.length})</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="visits">Visits ({patient.visits.length})</TabsTrigger>
              <TabsTrigger value="clinical-summary">Clinical</TabsTrigger>
              <TabsTrigger value="files">Files & Images ({patient.files.length})</TabsTrigger>
              <TabsTrigger value="receipts">Receipts</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Clinical Summary Tab */}
        <TabsContent value="clinical-summary" className="mt-4 space-y-6">
          {patient.visits.map((visit) => {
            const report = visit.clinicalReports[0] || null;
            const rate = visit.operationRate || 0;
            const isEdited = report && new Date(report.updatedAt).getTime() - new Date(report.createdAt).getTime() > 60000;

            return (
              <div key={visit.id} className="border rounded-lg p-4 space-y-3">
                {/* Visit header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(new Date(visit.visitDate), "MMM d, yyyy")}
                    </span>
                    <span className="text-muted-foreground">—</span>
                    <span>{visit.operation?.name || "Visit"}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{"\u20B9"}{rate.toLocaleString("en-IN")}</span>
                    {visit.discount > 0 && (
                      <span className="text-muted-foreground">(disc. {"\u20B9"}{visit.discount.toLocaleString("en-IN")})</span>
                    )}
                    <span className="text-muted-foreground">·</span>
                    <span>Dr. {visit.doctor?.name || "N/A"}</span>
                  </div>
                </div>

                {/* Clinical notes card */}
                {report ? (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4 space-y-2 text-sm">
                      {report.complaint && (
                        <div>
                          <span className="text-muted-foreground font-medium">Complaint: </span>
                          <span className="whitespace-pre-wrap">{report.complaint}</span>
                        </div>
                      )}
                      {report.examination && (
                        <div>
                          <span className="text-muted-foreground font-medium">Examination: </span>
                          <span className="whitespace-pre-wrap">{report.examination}</span>
                        </div>
                      )}
                      {report.diagnosis && (
                        <div>
                          <span className="text-muted-foreground font-medium">Diagnosis: </span>
                          <span className="whitespace-pre-wrap">{report.diagnosis}</span>
                        </div>
                      )}
                      {report.treatmentNotes && (
                        <div>
                          <span className="text-muted-foreground font-medium">Treatment: </span>
                          <span className="whitespace-pre-wrap">{report.treatmentNotes}</span>
                        </div>
                      )}
                      {report.medication && (
                        <div>
                          <span className="text-muted-foreground font-medium">Medication: </span>
                          <span className="whitespace-pre-wrap">{report.medication}</span>
                        </div>
                      )}
                      {report.estimate && (
                        <div>
                          <span className="text-muted-foreground font-medium">Estimate: </span>
                          <span className="whitespace-pre-wrap">{report.estimate}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground text-right pt-2">
                        Noted by Dr. {report.doctor.name} · {format(new Date(report.reportDate), "MMM d, yyyy")}
                        {isEdited && " (edited)"}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    (No clinical notes recorded)
                  </div>
                )}

                {/* Files for this visit */}
                {visit.files.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    {visit.files.length} file{visit.files.length !== 1 ? "s" : ""}:{" "}
                    {visit.files.map((f) => f.fileName || "file").join(", ")}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/visits/${visit.id}/examine`}>
                      {report ? "Edit Notes" : "Add Notes"}
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
          {patient.visits.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No visits recorded
            </div>
          )}
        </TabsContent>

        {/* Visits & Billing Tab (admin/reception only see this separate tab) */}
        {!isDoctor && (
          <TabsContent value="visits" className="mt-4 space-y-4">
            <Button size="sm" asChild>
              <Link href={`/visits/new?patientId=${patient.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                New Visit
              </Link>
            </Button>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {patient.visits.map((visit) => {
                    const billed = (visit.operationRate || 0) - visit.discount;
                    const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
                    const balance = billed - paid;
                    return (
                      <Link
                        key={visit.id}
                        href={`/visits/${visit.id}`}
                        className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
                      >
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              #{visit.caseNo}
                            </span>
                            {visit.operation?.name || "Visit"}
                            {visit.clinicalReports.length > 0 && (
                              <Badge variant="outline" className="text-xs">Notes</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(visit.visitDate), "MMM d, yyyy")}
                            {visit.doctor && ` · Dr. ${visit.doctor.name}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div>{"\u20B9"}{billed.toLocaleString("en-IN")}</div>
                          {showPayments && (
                            balance > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                Due: {"\u20B9"}{balance.toLocaleString("en-IN")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Paid
                              </Badge>
                            )
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  {patient.visits.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No visits recorded
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Receipts Tab — only for payment-visible roles */}
        {showPayments && (
          <TabsContent value="receipts" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {patient.visits.flatMap((visit) =>
                    visit.receipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {receipt.receiptNo && (
                              <span className="font-mono text-sm text-muted-foreground">
                                Rcpt #{receipt.receiptNo}
                              </span>
                            )}
                            {"\u20B9"}{receipt.amount.toLocaleString("en-IN")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(receipt.receiptDate), "MMM d, yyyy")} ·{" "}
                            Case #{visit.caseNo} · {visit.operation?.name || "Visit"} · {receipt.paymentMode}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/receipts/${receipt.id}/print`}>Print</Link>
                        </Button>
                      </div>
                    ))
                  )}
                  {patient.visits.flatMap((v) => v.receipts).length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No receipts recorded
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Files Tab */}
        <TabsContent value="files" className="mt-4 space-y-4">
          <FileUpload patientId={patient.id} />
          <FileGallery
            files={patient.files}
            canDelete={currentUser.permissionLevel <= 2}
          />
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Patient Code" value={patient.code ? `#${patient.code}` : null} />
                <InfoRow label="Father/Husband" value={patient.fatherHusbandName} />
                <InfoRow label="Date of Birth" value={patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "MMM d, yyyy") : null} />
                <InfoRow label="Occupation" value={patient.occupation} />
                <InfoRow label="Mobile" value={patient.mobile} />
                <InfoRow label="Phone" value={patient.phone} />
                <InfoRow label="Email" value={patient.email} />
                <Separator className="sm:col-span-2" />
                <InfoRow label="Address" value={[patient.addressLine1, patient.addressLine2, patient.addressLine3].filter(Boolean).join(", ")} />
                <InfoRow label="City" value={patient.city} />
                <InfoRow label="Pincode" value={patient.pincode} />
                <Separator className="sm:col-span-2" />
                <InfoRow label="Referring Physician" value={patient.referringPhysician} />
                <InfoRow label="Physician Phone" value={patient.physicianPhone} />
                {patient.remarks && (
                  <div className="sm:col-span-2">
                    <div className="text-sm text-muted-foreground">Remarks</div>
                    <div className="mt-0.5">{patient.remarks}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Medical History */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Medical History</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.diseases.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.diseases.map((pd) => (
                    <Badge key={pd.id} variant="destructive">
                      {pd.disease.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No medical conditions recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
