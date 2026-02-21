import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Edit, Plus, IndianRupee, AlertTriangle } from "lucide-react";
import { DeletePatientButton } from "./delete-button";
import { requireAuth } from "@/lib/auth";
import { canSeePayments, canEditPatients } from "@/lib/permissions";
import { FileUpload } from "@/components/file-upload";
import { FileGallery } from "@/components/file-gallery";
import { TreatmentTimeline } from "@/components/treatment-timeline";

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

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      diseases: { include: { disease: true } },
      visits: {
        orderBy: { visitDate: "desc" },
        include: {
          operation: { select: { name: true } },
          doctor: { select: { name: true } },
          receipts: { select: { id: true, receiptNo: true, amount: true, paymentMode: true, receiptDate: true } },
          clinicalReports: {
            include: { doctor: { select: { name: true } } },
            orderBy: { reportDate: "desc" },
            take: 1,
          },
          files: {
            include: { uploadedBy: true },
            orderBy: { createdAt: "desc" },
          },
          followUps: {
            orderBy: { visitDate: "asc" },
            include: {
              operation: { select: { name: true } },
              doctor: { select: { name: true } },
              clinicalReports: {
                include: { doctor: { select: { name: true } } },
                orderBy: { reportDate: "desc" },
                take: 1,
              },
              files: {
                include: { uploadedBy: true },
                orderBy: { createdAt: "desc" },
              },
              followUps: { select: { id: true } },
              receipts: { select: { amount: true } },
            },
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

  // Filter to only top-level visits
  const topLevelVisits = patient.visits.filter((v) => v.parentVisitId === null);

  // Calculate totals (all visits)
  let totalBilled = 0;
  let totalPaid = 0;
  for (const visit of patient.visits) {
    totalBilled += (visit.operationRate || 0) - visit.discount;
    totalPaid += visit.receipts.reduce((s, r) => s + r.amount, 0);
  }
  const totalBalance = totalBilled - totalPaid;

  // Visit stats
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
    ageDisplay = `${age}/${patient.gender || "?"}`;
  } else if (patient.ageAtRegistration) {
    const regDate = new Date(patient.createdAt);
    const yearsSinceReg = new Date().getFullYear() - regDate.getFullYear();
    const estimatedAge = patient.ageAtRegistration + yearsSinceReg;
    ageDisplay = `~${estimatedAge}/${patient.gender || "?"}`;
  } else if (patient.gender) {
    ageDisplay = patient.gender === "M" ? "Male" : "Female";
  }

  return (
    <div className="space-y-6">
      {/* Patient Header — Sticky */}
      <div className="sticky top-14 z-30 bg-background border-b -mx-4 px-4 md:-mx-6 md:px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-center shrink-0">
              <div className="text-[10px] uppercase tracking-wide opacity-80">Patient</div>
              <div className="text-xl font-bold font-mono">#{patient.code}</div>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">
                {patient.salutation && `${patient.salutation}. `}
                {patient.name}
              </h2>
              <p className="text-muted-foreground text-sm">
                {ageDisplay && <span>{ageDisplay}</span>}
                {patient.bloodGroup && <span> · Blood: {patient.bloodGroup}</span>}
                {patient.mobile && <span> · {patient.mobile}</span>}
                {patient.phone && !patient.mobile && <span> · {patient.phone}</span>}
              </p>
              {patient.diseases.length > 0 && (
                <p className="text-sm mt-0.5 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span className="text-destructive font-medium">
                    {patient.diseases.map((pd) => pd.disease.name).join(", ")}
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {visitCount} visit{visitCount !== 1 ? "s" : ""}
                {firstVisit && <span> · First: {format(new Date(firstVisit), "MMM yyyy")}</span>}
                {lastVisit && <span> · Last: {format(new Date(lastVisit), "MMM d, yyyy")}</span>}
                {showPayments && totalBalance > 0 && (
                  <span className="text-destructive font-medium"> · Outstanding: {"\u20B9"}{totalBalance.toLocaleString("en-IN")}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {showPayments && totalBalance > 0 && (
              <Button size="sm" asChild>
                <Link href={`/patients/${patient.id}/checkout`}>
                  <IndianRupee className="mr-1 h-3.5 w-3.5" />
                  Collect
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link href={`/visits/new?patientId=${patient.id}`}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                New Visit
              </Link>
            </Button>
            {canEditPatients(currentUser.permissionLevel) && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/patients/${patient.id}/edit`}>
                    <Edit className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Link>
                </Button>
                <DeletePatientButton patientId={patient.id} patientName={patient.name} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Summary — compact inline (admin/reception only) */}
      {showPayments && totalBilled > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="rounded-lg border px-4 py-2">
            <span className="text-muted-foreground">Billed: </span>
            <span className="font-bold">{"\u20B9"}{totalBilled.toLocaleString("en-IN")}</span>
          </div>
          <div className="rounded-lg border px-4 py-2">
            <span className="text-muted-foreground">Paid: </span>
            <span className="font-bold text-green-600">{"\u20B9"}{totalPaid.toLocaleString("en-IN")}</span>
          </div>
          {totalBalance > 0 && (
            <div className="rounded-lg border border-destructive/30 px-4 py-2">
              <span className="text-muted-foreground">Balance: </span>
              <span className="font-bold text-destructive">{"\u20B9"}{totalBalance.toLocaleString("en-IN")}</span>
            </div>
          )}
        </div>
      )}

      {/* ═══ Treatment History ═══ */}
      <section>
        <h3 className="text-lg font-semibold border-b pb-2 mb-2">Treatment History</h3>
        <TreatmentTimeline
          visits={topLevelVisits as any}
          showPayments={showPayments}
          patientId={patient.id}
        />
      </section>

      {/* ═══ Files & Images ═══ */}
      <section>
        <h3 className="text-lg font-semibold border-b pb-2 mb-2">Files & Images ({patient.files.length})</h3>
        <div className="space-y-4">
          <FileUpload patientId={patient.id} />
          <FileGallery
            files={patient.files}
            canDelete={currentUser.permissionLevel <= 2}
          />
        </div>
      </section>

      {/* ═══ Patient Information ═══ */}
      <section>
        <h3 className="text-lg font-semibold border-b pb-2 mb-2">Patient Information</h3>
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
            {/* Medical History */}
            {patient.diseases.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground font-medium mb-2">Medical History</div>
                <div className="flex flex-wrap gap-2">
                  {patient.diseases.map((pd) => (
                    <Badge key={pd.id} variant="destructive">{pd.disease.name}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ═══ Receipts (admin/reception only) ═══ */}
      {showPayments && (
        <section>
          <h3 className="text-lg font-semibold border-b pb-2 mb-2">Receipts</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {patient.visits.flatMap((visit) =>
                  visit.receipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {receipt.receiptNo && (
                            <span className="font-mono text-sm text-muted-foreground">Rcpt #{receipt.receiptNo}</span>
                          )}
                          {"\u20B9"}{receipt.amount.toLocaleString("en-IN")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(receipt.receiptDate), "MMM d, yyyy")} · Case #{visit.caseNo} · {visit.operation?.name || "Visit"} · {receipt.paymentMode}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/receipts/${receipt.id}/print`}>Print</Link>
                      </Button>
                    </div>
                  ))
                )}
                {patient.visits.flatMap((v) => v.receipts).length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">No receipts recorded</div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
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
