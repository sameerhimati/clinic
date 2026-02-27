"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import {
  Plus,
  IndianRupee,
  AlertTriangle,
  CalendarDays,
  MoreVertical,
  Edit,
  Stethoscope,
  UserCheck,
  FileText,
} from "lucide-react";
import { DeletePatientButton } from "./delete-button";
import { TreatmentTimeline, type VisitWithRelations, type FollowUpContext } from "@/components/treatment-timeline";
import { MedicalHistoryEditor } from "@/components/medical-history-editor";
import { StatusBadge } from "@/components/status-badge";
import { InfoRow } from "@/components/detail-row";
import { FileUpload } from "@/components/file-upload";
import { FileGallery } from "@/components/file-gallery";
import { QuickVisitSheet } from "@/components/quick-visit-sheet";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ToastOnParam } from "@/components/toast-on-param";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
import { toast } from "sonner";
import { useTransition } from "react";
import type { Operation, Doctor, Lab } from "@/components/visit-form";

type TodayAppointment = {
  id: number;
  status: string;
  visitId: number | null;
  timeSlot: string | null;
  doctorName: string | null;
  reason: string | null;
};

type FutureAppointment = {
  id: number;
  date: Date;
  timeSlot: string | null;
  doctorName: string | null;
  status: string;
};

type PatientFile = {
  id: number;
  fileName: string | null;
  filePath: string;
  description: string | null;
  fileType: string | null;
  createdAt: Date;
  uploadedBy: { name: string } | null;
  visit: { id: number; operation: { name: string } | null; caseNo?: number | null } | null;
};

type Disease = { id: number; name: string };

type Receipt = {
  id: number;
  receiptNo: number | null;
  amount: number;
  paymentMode: string;
  receiptDate: Date;
  visitCaseNo: number | null;
  visitOperationName: string | null;
};

export type PatientPageData = {
  patient: {
    id: number;
    code: number | null;
    name: string;
    salutation: string | null;
    gender: string | null;
    dateOfBirth: Date | null;
    ageAtRegistration: number | null;
    bloodGroup: string | null;
    mobile: string | null;
    phone: string | null;
    email: string | null;
    fatherHusbandName: string | null;
    occupation: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressLine3: string | null;
    city: string | null;
    pincode: string | null;
    referringPhysician: string | null;
    physicianPhone: string | null;
    remarks: string | null;
    createdAt: Date;
    diseases: { diseaseId: number; disease: { name: string } }[];
  };
  topLevelVisits: VisitWithRelations[];
  totalBilled: number;
  totalPaid: number;
  totalBalance: number;
  visitCount: number;
  firstVisit: Date | null;
  lastVisit: Date | null;
  ageDisplay: string | null;
  missingNotesCount: number;
  todayAppointment: TodayAppointment | null;
  futureAppointments: FutureAppointment[];
  files: PatientFile[];
  receipts: Receipt[];
  allDiseases: Disease[];
  operations: Operation[];
  doctors: Doctor[];
  labs: Lab[];
  currentUser: {
    id: number;
    name: string;
    permissionLevel: number;
  };
  canCollect: boolean;
  showInternalCosts: boolean;
  canEdit: boolean;
  isAdmin: boolean;
};

export function PatientPageClient({ data }: { data: PatientPageData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { patient, currentUser } = data;
  const isDoctor = currentUser.permissionLevel === 3;

  // Quick Visit Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [followUpContext, setFollowUpContext] = useState<{
    rootVisitId: number;
    operationId?: number;
    operationName: string;
    doctorId: number | null;
  } | undefined>(undefined);

  function openNewVisit() {
    setFollowUpContext(undefined);
    setSheetOpen(true);
  }

  function openFollowUp(ctx: FollowUpContext) {
    setFollowUpContext(ctx);
    setSheetOpen(true);
  }

  function handleMarkArrived(appointmentId: number) {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, "ARRIVED");
        router.refresh();
        toast.success("Marked as arrived");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  // Determine primary CTA
  const todayAppt = data.todayAppointment;
  let primaryCta: React.ReactNode = null;

  if (todayAppt) {
    if (todayAppt.status === "SCHEDULED") {
      primaryCta = (
        <Button size="sm" onClick={() => handleMarkArrived(todayAppt.id)} disabled={isPending}>
          <UserCheck className="mr-1 h-3.5 w-3.5" />
          Mark Arrived
        </Button>
      );
    } else if (todayAppt.status === "ARRIVED") {
      primaryCta = (
        <Button size="sm" onClick={openNewVisit}>
          <Stethoscope className="mr-1 h-3.5 w-3.5" />
          Start Treatment
        </Button>
      );
    } else if (todayAppt.status === "IN_PROGRESS" && todayAppt.visitId) {
      primaryCta = (
        <Button size="sm" asChild>
          <Link href={`/visits/${todayAppt.visitId}/examine`}>
            <FileText className="mr-1 h-3.5 w-3.5" />
            Continue Exam
          </Link>
        </Button>
      );
    }
  }

  if (!primaryCta && data.canCollect && data.totalBalance > 0) {
    primaryCta = (
      <Button size="sm" asChild>
        <Link href={`/patients/${patient.id}/checkout`}>
          <IndianRupee className="mr-1 h-3.5 w-3.5" />
          Collect ₹{data.totalBalance.toLocaleString("en-IN")}
        </Link>
      </Button>
    );
  }

  if (!primaryCta) {
    primaryCta = (
      <Button size="sm" onClick={openNewVisit}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        New Visit
      </Button>
    );
  }

  // Active visit ID for auto-expanding timeline
  const activeVisitId = todayAppt?.visitId || undefined;

  // Next future appointment
  const nextFutureAppt = data.futureAppointments[0];

  return (
    <div className="space-y-6">
      <ToastOnParam param="created" message="Patient registered" />
      <ToastOnParam param="paid" message="Payment collected — receipt created" />
      <Breadcrumbs items={[
        { label: "Patients", href: "/patients" },
        { label: patient.name },
      ]} />

      {/* Patient Header — Sticky */}
      <div className="sticky top-14 z-30 bg-background border-b shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] -mx-4 px-4 md:-mx-6 md:px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-center shrink-0">
              <div className="text-xl font-bold font-mono">#{patient.code}</div>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">
                {patient.salutation && `${patient.salutation}. `}
                {patient.name}
              </h2>
              <p className="text-muted-foreground text-sm">
                {data.ageDisplay && <span>{data.ageDisplay}</span>}
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
                {data.visitCount} visit{data.visitCount !== 1 ? "s" : ""}
                {data.firstVisit && <span> · First: {format(new Date(data.firstVisit), "MMM yyyy")}</span>}
                {data.lastVisit && <span> · Last: {format(new Date(data.lastVisit), "dd-MM-yyyy")}</span>}
                {data.canCollect && data.totalBalance > 0 && (
                  <span className="text-destructive font-medium"> · ₹{data.totalBalance.toLocaleString("en-IN")} due</span>
                )}
                {nextFutureAppt && (
                  <span> · Next appt: {format(new Date(nextFutureAppt.date), "dd MMM")}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 items-center">
            {primaryCta}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isDoctor && (
                  <>
                    <DropdownMenuItem onClick={openNewVisit}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Visit
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/appointments/new?patientId=${patient.id}`}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Schedule Appointment
                      </Link>
                    </DropdownMenuItem>
                    {data.canCollect && data.totalBalance > 0 && (
                      <DropdownMenuItem asChild>
                        <Link href={`/patients/${patient.id}/checkout`}>
                          <IndianRupee className="mr-2 h-4 w-4" />
                          Collect Payment
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                {data.canEdit && (
                  <DropdownMenuItem asChild>
                    <Link href={`/patients/${patient.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Patient
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Needs Attention Banner */}
      {(data.missingNotesCount > 0 || (data.canCollect && data.totalBalance > 0)) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
          {data.missingNotesCount > 0 && (
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {data.missingNotesCount} visit{data.missingNotesCount !== 1 ? "s" : ""} need clinical notes
            </p>
          )}
          {data.canCollect && data.totalBalance > 0 && (
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 shrink-0" />
              ₹{data.totalBalance.toLocaleString("en-IN")} outstanding
              <Link href={`/patients/${patient.id}/checkout`} className="text-primary hover:underline ml-1">
                Collect →
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Upcoming Appointments */}
      {data.futureAppointments.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Upcoming Appointments</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.futureAppointments.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <div className="font-medium text-sm">
                        {format(new Date(appt.date), "EEE, dd MMM")}
                        {appt.timeSlot && <span className="text-muted-foreground"> · {appt.timeSlot}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {appt.doctorName && `Dr. ${appt.doctorName}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={appt.status} />
                      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                        <Link href={`/appointments?date=${format(new Date(appt.date), "yyyy-MM-dd")}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Treatment History */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Treatment History</h3>
        <TreatmentTimeline
          visits={data.topLevelVisits}
          showInternalCosts={data.showInternalCosts}
          patientId={patient.id}
          activeVisitId={activeVisitId || undefined}
          onAddFollowUp={openFollowUp}
        />
      </section>

      {/* Files & Images */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Files ({data.files.length})</h3>
        <div className="space-y-4">
          <FileUpload patientId={patient.id} />
          <FileGallery
            files={data.files}
            canDelete={currentUser.permissionLevel <= 2}
          />
        </div>
      </section>

      {/* Patient Information */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Patient Information</h3>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Patient Code" value={patient.code ? `#${patient.code}` : null} />
              <InfoRow label="Father/Husband" value={patient.fatherHusbandName} />
              <InfoRow label="Date of Birth" value={patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "dd-MM-yyyy") : null} />
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
            <MedicalHistoryEditor
              patientId={patient.id}
              currentDiseaseIds={patient.diseases.map((pd) => pd.diseaseId)}
              allDiseases={data.allDiseases}
              canEdit={data.canEdit}
              diseaseNames={patient.diseases.map((pd) => pd.disease.name)}
            />
          </CardContent>
        </Card>
        {data.isAdmin && (
          <div className="mt-4 flex justify-end">
            <DeletePatientButton patientId={patient.id} patientName={patient.name} />
          </div>
        )}
      </section>

      {/* Receipts — hidden for doctors */}
      {currentUser.permissionLevel <= 2 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Receipts</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.receipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {receipt.receiptNo && (
                          <span className="font-mono text-sm text-muted-foreground">Rcpt #{receipt.receiptNo}</span>
                        )}
                        ₹{receipt.amount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(receipt.receiptDate), "dd-MM-yyyy")}
                        {receipt.visitCaseNo && ` · Case #${receipt.visitCaseNo}`}
                        {receipt.visitOperationName && ` · ${receipt.visitOperationName}`}
                        {` · ${receipt.paymentMode}`}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/receipts/${receipt.id}/print`}>Print</Link>
                    </Button>
                  </div>
                ))}
                {data.receipts.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">No receipts</div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Quick Visit Sheet */}
      <QuickVisitSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        patientId={patient.id}
        patientName={patient.name}
        patientCode={patient.code}
        operations={data.operations}
        doctors={data.doctors}
        labs={data.labs}
        permissionLevel={currentUser.permissionLevel}
        currentDoctorId={currentUser.id}
        followUpContext={followUpContext}
        appointmentId={todayAppt?.status === "ARRIVED" ? todayAppt.id : undefined}
      />
    </div>
  );
}
