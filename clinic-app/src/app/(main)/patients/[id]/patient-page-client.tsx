"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  IndianRupee,
  AlertTriangle,
  CalendarDays,
  MoreVertical,
  Edit,
  Stethoscope,
  UserCheck,
  FileText,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { DeletePatientButton } from "./delete-button";
import { TreatmentTimeline, type VisitWithRelations, type FollowUpContext } from "@/components/treatment-timeline";
import { VisitLogTable } from "@/components/visit-log-table";
import { MedicalHistoryEditor } from "@/components/medical-history-editor";
import { StatusBadge } from "@/components/status-badge";
import { InfoRow } from "@/components/detail-row";
import { FileUpload } from "@/components/file-upload";
import { FileGallery } from "@/components/file-gallery";
import { QuickVisitSheet } from "@/components/quick-visit-sheet";
import { TreatmentPlanCard, type TreatmentPlanData } from "@/components/treatment-plan-card";
import { TreatmentChainCard, type TreatmentChainData } from "@/components/treatment-chain-card";
import { ClinicalNotepad, type NoteEntry, type ChainOption } from "@/components/clinical-notepad";
import { InlinePlanSheet } from "@/components/inline-plan-sheet";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CollectPaymentDialog } from "@/components/collect-payment-dialog";
import { ScheduleFollowUpDialog, type ScheduleDefaults } from "@/components/schedule-followup-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToothChart, type ToothStatusData } from "@/components/tooth-chart";
import { TOOTH_STATUSES, TOOTH_STATUS_INDICATORS, getStatusColor, getToothName, getToothShortName, type ToothStatusKey } from "@/lib/dental";
import { toTitleCase, formatDate } from "@/lib/format";
import { ToastOnParam } from "@/components/toast-on-param";
import { ClipboardList, ChevronRight, SmilePlus } from "lucide-react";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
import { createVisitAndExamine } from "@/app/(main)/visits/actions";
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

type PastAppointment = {
  id: number;
  date: Date;
  timeSlot: string | null;
  doctorName: string | null;
  reason: string | null;
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
    corporatePartnerName: string | null;
    createdAt: Date;
    diseases: { diseaseId: number; disease: { name: string } }[];
  };
  topLevelVisits: VisitWithRelations[];
  totalBilled: number;
  totalPaid: number;
  totalBalance: number;
  escrowBalance: number;
  totalCollected: number;
  plannedCost: number;
  visitCount: number;
  firstVisit: Date | null;
  lastVisit: Date | null;
  ageDisplay: string | null;
  missingNotesCount: number;
  todayAppointment: TodayAppointment | null;
  todayAppointments: PastAppointment[];
  futureAppointments: FutureAppointment[];
  pastAppointments: PastAppointment[];
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
    isSuperUser: boolean;
  };
  canCollect: boolean;
  showInternalCosts: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  treatmentPlans: TreatmentPlanData[];
  treatmentChains: TreatmentChainData[];
  clinicalNotes: NoteEntry[];
  toothStatuses: {
    toothNumber: number;
    status: string;
    findingName: string | null;
    findingColor: string | null;
  }[];
  toothHistory: {
    toothNumber: number;
    status: string;
    findingName: string | null;
    doctorName: string;
    caseNo: number | null;
    visitId: number | null;
    recordedAt: string;
  }[];
  labOrders: {
    id: number;
    labName: string;
    materialName: string;
    quantity: number;
    unitRate: number;
    rateAdjustment: number;
    totalAmount: number;
    adjustmentNote: string | null;
    status: string;
    orderedDate: string;
    expectedDate: string | null;
    receivedDate: string | null;
    toothNumbers: string | null;
    createdByName: string;
    receivedByName: string | null;
    planItemId: number | null;
    planItemLabel: string | null;
    notes: string | null;
  }[];
};

function ActiveTreatmentsSection({ chains, standalonePlans, patientId, isDoctor, permissionLevel, onScheduleFollowUp, onAddPlan }: {
  chains: TreatmentChainData[];
  standalonePlans: TreatmentPlanData[];
  patientId: number;
  isDoctor: boolean;
  permissionLevel: number;
  onScheduleFollowUp?: (defaults: ScheduleDefaults) => void;
  onAddPlan?: (chainId: number, chainTitle: string, toothNumbers: string | null) => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const activeStandalone = standalonePlans.filter((p) => p.status === "ACTIVE");
  const completedStandalone = standalonePlans.filter((p) => p.status !== "ACTIVE");
  const hasAnyActive = chains.length > 0 || activeStandalone.length > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Active Treatments</h3>
      </div>
      {hasAnyActive ? (
        <div className="space-y-3">
          {chains.map((chain, i) => (
            <TreatmentChainCard
              key={chain.id}
              chain={chain}
              isDoctor={isDoctor}
              permissionLevel={permissionLevel}
              defaultExpanded={i < 2}
              onScheduleFollowUp={onScheduleFollowUp}
              onAddPlan={onAddPlan}
            />
          ))}
          {activeStandalone.map((plan) => (
            <TreatmentPlanCard key={plan.id} plan={plan} isDoctor={isDoctor} permissionLevel={permissionLevel} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No active treatments
          </CardContent>
        </Card>
      )}
      {completedStandalone.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
          >
            {showCompleted ? "Hide" : "Show"} completed ({completedStandalone.length})
          </button>
          {showCompleted && (
            <div className="space-y-4 mt-3 opacity-60">
              {completedStandalone.map((plan) => (
                <TreatmentPlanCard key={plan.id} plan={plan} isDoctor={isDoctor} permissionLevel={permissionLevel} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ScheduleNowBanner({ onSchedule }: { onSchedule?: () => void }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("created");
  });

  if (!visible) return null;

  return (
    <Card className="border-blue-300 bg-blue-50/50">
      <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <UserCheck className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="font-medium">Patient registered successfully</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onSchedule ? (
            <Button size="sm" onClick={onSchedule}>
              <CalendarDays className="mr-1 h-3.5 w-3.5" />
              Schedule Appointment
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link href={`/appointments/new`}>
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                Schedule Appointment
              </Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setVisible(false)} className="h-7 w-7 p-0">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getSmartScheduleUrl(patientId: number, plans: TreatmentPlanData[]): string {
  const base = `/appointments/new?patientId=${patientId}`;
  for (const plan of plans.filter((p) => p.status === "ACTIVE")) {
    const sorted = [...plan.items].sort((a, b) => a.sortOrder - b.sortOrder);
    const next = sorted.find((i) => !i.visitId && !i.modifiedStatus && !i.appointment);
    if (next) {
      const params = new URLSearchParams({ patientId: String(patientId) });
      if (next.assignedDoctorId) params.set("doctorId", String(next.assignedDoctorId));
      params.set("reason", next.label);
      params.set("planItemId", String(next.id));
      return `/appointments/new?${params.toString()}`;
    }
  }
  return base;
}

function getSmartScheduleDefaults(plans: TreatmentPlanData[], chains?: TreatmentChainData[]): ScheduleDefaults | undefined {
  // First check chains (most common for multi-step treatments)
  if (chains) {
    for (const chain of chains.filter((c) => c.status === "ACTIVE")) {
      for (const plan of chain.plans.filter((p) => p.status === "ACTIVE")) {
        const sorted = [...plan.items].sort((a, b) => a.sortOrder - b.sortOrder);
        const next = sorted.find((i) => !i.visitId && !i.modifiedStatus && !i.appointment);
        if (next) {
          return {
            reason: next.label,
            doctorId: next.assignedDoctorId || undefined,
            date: next.scheduledDate ? new Date(next.scheduledDate).toISOString().split("T")[0] : undefined,
            planItemId: next.id,
          };
        }
      }
    }
  }
  // Then standalone plans
  for (const plan of plans.filter((p) => p.status === "ACTIVE")) {
    const sorted = [...plan.items].sort((a, b) => a.sortOrder - b.sortOrder);
    const next = sorted.find((i) => !i.visitId && !i.modifiedStatus && !i.appointment);
    if (next) {
      return {
        reason: next.label,
        doctorId: next.assignedDoctorId || undefined,
        planItemId: next.id,
      };
    }
  }
  return undefined;
}

export function PatientPageClient({ data }: { data: PatientPageData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { patient, currentUser } = data;
  const isDoctor = currentUser.permissionLevel >= 3;

  const smartScheduleUrl = getSmartScheduleUrl(patient.id, data.treatmentPlans);

  // Treatment history view mode
  const [viewMode, setViewMode] = useState<"timeline" | "log">("log");

  // Tooth history modal
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  // Task 2A: Dental chart as dialog (saves ~450px vertical space)
  const [chartOpen, setChartOpen] = useState(false);

  // Task 3A: Collapsible sections
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);

  // Visit notes popup
  const [selectedVisit, setSelectedVisit] = useState<VisitWithRelations | null>(null);

  // Collect Payment + Schedule Follow-Up dialogs
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("collect");
  });
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDefaults, setScheduleDefaults] = useState<ScheduleDefaults | undefined>();

  // InlinePlanSheet for adding plans to active chains
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [planSheetChainId, setPlanSheetChainId] = useState<number | undefined>();
  const [planSheetChainTitle, setPlanSheetChainTitle] = useState<string | undefined>();
  const [planSheetChainTeeth, setPlanSheetChainTeeth] = useState<string | null>(null);

  function openPlanSheet(chainId: number, chainTitle: string, toothNumbers: string | null) {
    setPlanSheetChainId(chainId);
    setPlanSheetChainTitle(chainTitle);
    setPlanSheetChainTeeth(toothNumbers);
    setPlanSheetOpen(true);
  }

  function openScheduleDialog(defaults?: ScheduleDefaults) {
    setScheduleDefaults(defaults);
    setScheduleDialogOpen(true);
  }

  // Build visitId → plan title mapping for timeline badges
  const visitPlanMap = new Map<number, string>();
  for (const plan of data.treatmentPlans) {
    for (const item of plan.items) {
      if (item.visitId) {
        visitPlanMap.set(item.visitId, plan.title);
      }
    }
  }

  // Compute teeth referenced in active treatment plans for chart highlighting
  const planTeethSet = new Set<number>();
  for (const plan of data.treatmentPlans) {
    if (plan.status !== "ACTIVE") continue;
    // Parse tooth numbers from plan title
    const matches = plan.title.matchAll(/tooth\s*#?(\d{2})/gi);
    for (const m of matches) {
      const num = parseInt(m[1]);
      if (num >= 11 && num <= 48) planTeethSet.add(num);
    }
  }
  const planTeeth = Array.from(planTeethSet);

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

  function handleStatusChange(appointmentId: number, status: string) {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, status);
        router.refresh();
        toast.success(status === "ARRIVED" ? "Checked in" : status === "CANCELLED" ? "Appointment cancelled" : "Status updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  // Determine primary CTA + secondary actions based on appointment state
  const todayAppt = data.todayAppointment;
  let primaryCta: React.ReactNode = null;
  let appointmentActions: React.ReactNode = null;

  if (todayAppt) {
    if (todayAppt.status === "SCHEDULED") {
      // SCHEDULED: Check In (reception only), Reschedule + Cancel (secondary)
      if (!isDoctor) {
        primaryCta = (
          <Button size="sm" onClick={() => handleStatusChange(todayAppt.id, "ARRIVED")} disabled={isPending}>
            <UserCheck className="mr-1 h-3.5 w-3.5" />
            Check In
          </Button>
        );
      }
      appointmentActions = (
        <>
          <DropdownMenuItem asChild>
            <Link href={`/appointments/${todayAppt.id}/reschedule`}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reschedule
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusChange(todayAppt.id, "CANCELLED")}
            className="text-destructive"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Appointment
          </DropdownMenuItem>
        </>
      );
    } else if (todayAppt.status === "ARRIVED") {
      // ARRIVED: Doctor goes straight to exam form. Reception just sees status — no CTA needed.
      if (isDoctor) {
        primaryCta = (
          <Button size="sm" disabled={isPending} onClick={() => {
            startTransition(async () => {
              try {
                const { visitId } = await createVisitAndExamine(patient.id, todayAppt.id);
                router.push(`/visits/${visitId}/examine`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to start examination");
              }
            });
          }}>
            <Stethoscope className="mr-1 h-3.5 w-3.5" />
            {isPending ? "Starting..." : "Start Treatment"}
          </Button>
        );
      }
      // Reception: primaryCta stays null → falls through to default (Schedule Appointment / Collect)
    } else if (todayAppt.status === "IN_PROGRESS" && todayAppt.visitId) {
      primaryCta = isDoctor ? (
        <Button size="sm" asChild>
          <Link href={`/visits/${todayAppt.visitId}/examine`}>
            <FileText className="mr-1 h-3.5 w-3.5" />
            Continue Exam
          </Link>
        </Button>
      ) : (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/visits/${todayAppt.visitId}`}>
            <FileText className="mr-1 h-3.5 w-3.5" />
            View Visit
          </Link>
        </Button>
      );
    }
  }

  // No appointment-driven CTA — default actions
  if (!primaryCta) {
    const hasActiveAppointment = todayAppt && ["ARRIVED", "IN_PROGRESS"].includes(todayAppt.status);
    const outstanding = data.totalBilled - data.totalCollected;
    if (data.canCollect && outstanding > 0) {
      primaryCta = (
        <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
          <IndianRupee className="mr-1 h-3.5 w-3.5" />
          Collect {"\u20B9"}{outstanding.toLocaleString("en-IN")}
        </Button>
      );
    } else if (!isDoctor && !hasActiveAppointment) {
      // Only show "Schedule Appointment" if there's no active appointment today
      primaryCta = (
        <Button size="sm" onClick={() => openScheduleDialog(getSmartScheduleDefaults(data.treatmentPlans, data.treatmentChains))}>
          <CalendarDays className="mr-1 h-3.5 w-3.5" />
          Schedule Appointment
        </Button>
      );
    }
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
        { label: toTitleCase(patient.name) },
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
                {toTitleCase(patient.name)}
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
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {patient.corporatePartnerName && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {patient.corporatePartnerName}
                  </span>
                )}
                {data.canCollect && (() => {
                  const outstanding = data.totalBilled - data.totalCollected;
                  if (outstanding > 0) return (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                      Due: {"\u20B9"}{outstanding.toLocaleString("en-IN")}
                    </span>
                  );
                  if (outstanding < 0) return (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                      Credit: {"\u20B9"}{Math.abs(outstanding).toLocaleString("en-IN")}
                    </span>
                  );
                  if (data.totalBilled > 0) return (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                      Paid up
                    </span>
                  );
                  return null;
                })()}
                <span className="text-xs text-muted-foreground">
                  {data.visitCount} visit{data.visitCount !== 1 ? "s" : ""}
                  {data.lastVisit && <span> · Last: {formatDate(data.lastVisit)}</span>}
                  {nextFutureAppt && (
                    <span> · Next appt: {formatDate(nextFutureAppt.date)}</span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 items-center">
            {primaryCta}
            {isDoctor && (
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setChartOpen(true)} title="Dental Chart">
                <SmilePlus className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setChartOpen(true)}>
                  <SmilePlus className="mr-2 h-4 w-4" />
                  Dental Chart
                </DropdownMenuItem>
                {(appointmentActions || data.canEdit || data.canCollect) && <DropdownMenuSeparator />}
                {appointmentActions}
                {appointmentActions && data.canEdit && <DropdownMenuSeparator />}
                {data.canEdit && (
                    <DropdownMenuItem asChild>
                      <Link href={`/patients/${patient.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Patient
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {data.canCollect && (
                    <DropdownMenuItem onClick={() => setPaymentDialogOpen(true)}>
                      <IndianRupee className="mr-2 h-4 w-4" />
                      Collect Payment
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Task 3D: Compact attention summary — single row replacing separate banners */}
      {(() => {
        const alerts: React.ReactNode[] = [];
        if (data.missingNotesCount > 0 && isDoctor) {
          alerts.push(
            <span key="notes" className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {data.missingNotesCount} missing note{data.missingNotesCount !== 1 ? "s" : ""}
            </span>
          );
        }
        if (data.canCollect && data.totalBilled - data.totalCollected > 0) {
          alerts.push(
            <button key="balance" type="button" onClick={() => setPaymentDialogOpen(true)} className="flex items-center gap-1 hover:underline">
              <IndianRupee className="h-3.5 w-3.5" />
              ₹{(data.totalBilled - data.totalCollected).toLocaleString("en-IN")} due
            </button>
          );
        }
        // Find next plan step
        const nextStep = data.treatmentPlans
          .filter(p => p.status === "ACTIVE")
          .flatMap(p => p.items.filter(i => !i.completedAt))
          .sort((a, b) => a.sortOrder - b.sortOrder)[0];
        if (nextStep) {
          alerts.push(
            <span key="next" className="flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              Next: {nextStep.label}
            </span>
          );
        }
        if (alerts.length === 0) return null;
        return (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-amber-800">
            {alerts}
          </div>
        );
      })()}

      {/* Post-Registration: Schedule Now banner */}
      <ScheduleNowBanner onSchedule={!isDoctor ? () => openScheduleDialog() : undefined} />

      {/* Task 2A: Dental Chart Dialog (moved from inline hero) */}
      <Dialog open={chartOpen} onOpenChange={setChartOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Dental Chart</DialogTitle>
            <DialogDescription className="sr-only">Interactive dental chart showing tooth statuses and findings</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <ToothChart
              selected={[]}
              size="lg"
              toothStatuses={data.toothStatuses.map((ts) => ({
                toothNumber: ts.toothNumber,
                status: ts.status,
                findingName: ts.findingName || undefined,
                color: ts.findingColor || undefined,
              }))}
              onDoubleClick={(tooth) => setSelectedTooth(tooth)}
              highlightTeeth={planTeeth.length > 0 ? planTeeth : undefined}
              readOnly
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {(() => {
              const findingsCount = data.toothStatuses.filter((ts) => ts.status !== "HEALTHY").length;
              return findingsCount > 0 ? `${findingsCount} teeth with findings · Double-click for history` : "No findings recorded";
            })()}
          </p>
        </DialogContent>
      </Dialog>

      {/* Tooth History Modal — Premium Design */}
      <Dialog open={selectedTooth !== null} onOpenChange={(open) => { if (!open) setSelectedTooth(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto p-0">
          {selectedTooth && (() => {
            const currentStatus = data.toothStatuses.find((ts) => ts.toothNumber === selectedTooth);
            const history = data.toothHistory.filter((th) => th.toothNumber === selectedTooth);
            const statusKey = (currentStatus?.status || "HEALTHY") as ToothStatusKey;
            const statusColor = getStatusColor(statusKey);
            const statusLabel = TOOTH_STATUSES[statusKey]?.label || statusKey;
            const toothName = getToothName(selectedTooth);
            // Check if tooth is in active treatment plan
            const activePlanForTooth = data.treatmentPlans.find(
              (p) => p.status === "ACTIVE" && p.title.toLowerCase().includes(`tooth`) && p.title.includes(String(selectedTooth))
            );
            // Find pending plan items for "what's next"
            const pendingPlanItems = data.treatmentPlans
              .filter((p) => p.status === "ACTIVE")
              .flatMap((p) => p.items.filter((item) => !item.completedAt))
              .filter((item) => {
                // Check if plan title references this tooth
                const plan = data.treatmentPlans.find((p) => p.items.some((i) => i.id === item.id));
                return plan && plan.title.includes(String(selectedTooth));
              });

            return (
              <>
                {/* Full-width colored header */}
                <div className="px-6 pt-6 pb-5 rounded-t-lg" style={{ backgroundColor: statusColor + "12" }}>
                  <DialogHeader className="space-y-0">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold font-mono text-lg shadow-sm"
                        style={{ backgroundColor: statusColor }}
                      >
                        {selectedTooth}
                      </div>
                      <div className="flex-1 min-w-0">
                        <DialogTitle className="text-xl font-bold">Tooth #{selectedTooth}</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">{toothName}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: statusColor }}
                          >
                            <span>{TOOTH_STATUS_INDICATORS[statusKey] || "H"}</span>
                            {statusLabel}
                          </div>
                          {currentStatus?.findingName && (
                            <span className="text-xs text-muted-foreground">{currentStatus.findingName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DialogDescription className="sr-only">
                      Clinical history for tooth {selectedTooth} — {toothName}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="px-6 pb-6 space-y-6">
                  {/* Active treatment plan banner */}
                  {activePlanForTooth && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Active Treatment Plan</div>
                      <div className="text-sm font-medium text-amber-900 mt-0.5">{activePlanForTooth.title}</div>
                    </div>
                  )}

                  {/* What's Next — pending plan items */}
                  {pendingPlanItems.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                      <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">Next Steps</div>
                      {pendingPlanItems.map((item) => (
                        <div key={item.id} className="text-sm text-blue-900 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          {item.label}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* History Timeline */}
                  {history.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-4">Status History</div>
                      <div className="relative pl-7 space-y-5">
                        {/* Vertical line — thicker */}
                        <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-border rounded-full" />
                        {history.map((entry, i) => {
                          const entryColor = getStatusColor(entry.status);
                          const entryLabel = TOOTH_STATUSES[entry.status as ToothStatusKey]?.label || entry.status;
                          return (
                            <div key={i} className="relative">
                              <div
                                className="absolute -left-6 top-0.5 w-[18px] h-[18px] rounded-full border-[3px] border-background shadow-xs"
                                style={{ backgroundColor: entryColor }}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">{entryLabel}</span>
                                  {entry.findingName && (
                                    <span className="text-xs text-muted-foreground">— {entry.findingName}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <span>{formatDate(entry.recordedAt)}</span>
                                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                  <span>Dr. {toTitleCase(entry.doctorName)}</span>
                                  {entry.caseNo && entry.visitId ? (
                                    <Link href={`/visits/${entry.visitId}`} className="text-primary hover:underline">
                                      Case #{entry.caseNo}
                                    </Link>
                                  ) : entry.caseNo ? (
                                    <span>Case #{entry.caseNo}</span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {!currentStatus && history.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground/30 text-4xl mb-3">&#129463;</div>
                      <div className="font-semibold text-sm">No clinical history</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        This tooth has no recorded findings or procedures
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Visit Notes Popup */}
      <Dialog open={selectedVisit !== null} onOpenChange={(open) => { if (!open) setSelectedVisit(null); }}>
        <DialogContent className="sm:max-w-md">
          {selectedVisit && (() => {
            const report = selectedVisit.clinicalReports[0] || null;
            const operationName = selectedVisit.stepLabel || selectedVisit.operation?.name || selectedVisit.customLabel || "Visit";
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 text-center shrink-0">
                      <div className="text-sm font-bold font-mono">#{selectedVisit.caseNo}</div>
                    </div>
                    <div>
                      <DialogTitle className="text-base">{operationName}</DialogTitle>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(selectedVisit.visitDate)}
                        {selectedVisit.doctor && ` · Dr. ${toTitleCase(selectedVisit.doctor.name)}`}
                      </p>
                    </div>
                  </div>
                  <DialogDescription className="sr-only">
                    Clinical notes for case #{selectedVisit.caseNo}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  {report ? (
                    <>
                      {report.complaint && (
                        <div>
                          <div className="text-xs text-muted-foreground font-medium mb-0.5">Complaint</div>
                          <p className="text-sm">{report.complaint}</p>
                        </div>
                      )}
                      {report.diagnosis && (
                        <div>
                          <div className="text-xs text-muted-foreground font-medium mb-0.5">Diagnosis</div>
                          <p className="text-sm">{report.diagnosis}</p>
                        </div>
                      )}
                      {report.treatmentNotes && (
                        <div>
                          <div className="text-xs text-muted-foreground font-medium mb-0.5">Treatment</div>
                          <p className="text-sm">{report.treatmentNotes}</p>
                        </div>
                      )}
                      {!report.complaint && !report.diagnosis && !report.treatmentNotes && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No notes recorded
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No notes recorded
                    </div>
                  )}
                </div>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/visits/${selectedVisit.id}`}>View Details</Link>
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Active Treatments — unified chains + standalone plans */}
      <ActiveTreatmentsSection
        chains={data.treatmentChains}
        standalonePlans={data.treatmentPlans}
        patientId={patient.id}
        isDoctor={isDoctor}
        permissionLevel={currentUser.permissionLevel}
        onScheduleFollowUp={!isDoctor ? openScheduleDialog : undefined}
        onAddPlan={currentUser.permissionLevel === 3 ? openPlanSheet : undefined}
      />

      {/* 3. Appointments (Task 2C: moved up — "what's happening today/next?") */}
      {/* Task 3B: Compact — show today + next 1 future only */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Appointments</h3>
          {!isDoctor && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openScheduleDialog(getSmartScheduleDefaults(data.treatmentPlans, data.treatmentChains))}>
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              Schedule
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.todayAppointments.map((appt) => (
                <div key={`t-${appt.id}`} className={`flex items-center justify-between px-4 py-3 ${
                  appt.status === "ARRIVED" ? "bg-green-50 border-l-4 border-l-green-500" :
                  appt.status === "IN_PROGRESS" ? "bg-blue-50 border-l-4 border-l-blue-500" :
                  "bg-amber-50 border-l-4 border-l-amber-400"
                }`}>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today</span>
                      {appt.timeSlot && <span>{appt.timeSlot}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {appt.doctorName && `Dr. ${appt.doctorName}`}
                      {appt.reason && ` · ${appt.reason}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {appt.status === "SCHEDULED" && !isDoctor && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleStatusChange(appt.id, "ARRIVED")}
                        disabled={isPending}
                      >
                        <UserCheck className="mr-1 h-3 w-3" />
                        Check In
                      </Button>
                    )}
                    <StatusBadge status={appt.status} />
                  </div>
                </div>
              ))}
              {/* Task 3B: Show only next 1 future appointment inline */}
              {data.futureAppointments.slice(0, 1).map((appt) => (
                <div key={`f-${appt.id}`} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <div className="font-medium text-sm">
                      {formatDate(appt.date)}
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
              {data.todayAppointments.length === 0 && data.futureAppointments.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No appointments scheduled
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Task 3B: View all link when there are more appointments */}
        {(data.futureAppointments.length > 1 || data.pastAppointments.length > 0) && (
          <Link
            href={`/appointments?patientId=${patient.id}`}
            className="text-xs text-muted-foreground hover:text-foreground mt-2 inline-block transition-colors"
          >
            View all appointments ({data.futureAppointments.length + data.pastAppointments.length + data.todayAppointments.length})
          </Link>
        )}
      </section>

      {/* 4. Financial Summary — elevated for L1/L2 (hidden for doctors) */}
      {currentUser.permissionLevel <= 2 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Financial Summary</h3>

          {/* Summary cards */}
          {(() => {
            const unifiedOutstanding = data.totalBilled - data.totalCollected;
            return (
              <>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Billed</div>
                    <div className="text-lg font-semibold tabular-nums mt-0.5">
                      ₹{data.totalBilled.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-green-50 p-3">
                    <div className="text-xs text-green-700 font-medium uppercase tracking-wide">Total Collected</div>
                    <div className="text-lg font-semibold text-green-800 tabular-nums mt-0.5">
                      ₹{data.totalCollected.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className={`rounded-lg border p-3 ${unifiedOutstanding > 0 ? "bg-red-50" : unifiedOutstanding < 0 ? "bg-green-50" : "bg-muted/50"}`}>
                    <div className={`text-xs font-medium uppercase tracking-wide ${unifiedOutstanding > 0 ? "text-red-700" : unifiedOutstanding < 0 ? "text-green-700" : "text-muted-foreground"}`}>
                      {unifiedOutstanding > 0 ? "Outstanding" : unifiedOutstanding < 0 ? "Credit" : "Balance"}
                    </div>
                    <div className={`text-lg font-semibold tabular-nums mt-0.5 ${unifiedOutstanding > 0 ? "text-red-800" : unifiedOutstanding < 0 ? "text-green-800" : ""}`}>
                      {unifiedOutstanding < 0 ? "+" : ""}₹{Math.abs(unifiedOutstanding).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Planned treatment cost — informational */}
                {data.plannedCost > 0 && (
                  <div className="rounded-lg border px-3 py-2 mb-3 text-sm flex items-center gap-2 bg-blue-50/50 border-blue-200">
                    <ClipboardList className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="text-blue-700">
                      Planned treatments: ₹{data.plannedCost.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {/* Collect Payment button */}
                {data.canCollect && unifiedOutstanding > 0 && (
                  <div className="mb-3">
                    <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                      <IndianRupee className="mr-1 h-3.5 w-3.5" />
                      Collect Payment
                    </Button>
                  </div>
                )}
              </>
            );
          })()}

          {/* Receipt list */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.receipts.map((receipt) => (
                  <Link key={receipt.id} href={`/receipts/${receipt.id}/print`} className="flex items-center justify-between px-4 py-2.5 hover:bg-accent transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {receipt.receiptNo && (
                          <span className="font-mono text-xs text-muted-foreground">#{receipt.receiptNo}</span>
                        )}
                        <span className="tabular-nums">₹{receipt.amount.toLocaleString("en-IN")}</span>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">{receipt.paymentMode}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(receipt.receiptDate)}
                        {receipt.visitCaseNo && ` · Case #${receipt.visitCaseNo}`}
                        {receipt.visitOperationName && ` · ${receipt.visitOperationName}`}
                      </div>
                    </div>
                  </Link>
                ))}
                {data.receipts.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">No receipts yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Lab Orders (L1/L2 only) */}
      {data.canCollect && data.labOrders.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Lab Orders</h3>
          <Card>
            <CardContent className="pt-4">
              <div className="divide-y">
                {data.labOrders.map((lo) => (
                  <div key={lo.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {lo.materialName}
                        <Badge variant="outline" className={`text-xs px-1.5 py-0 ${
                          lo.status === "ORDERED" ? "text-amber-700 border-amber-200 bg-amber-50" : "text-green-700 border-green-200 bg-green-50"
                        }`}>
                          {lo.status === "ORDERED" ? "Ordered" : "Received"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {lo.labName}
                        {lo.quantity > 1 && ` · Qty ${lo.quantity}`}
                        {lo.toothNumbers && ` · Teeth ${lo.toothNumbers}`}
                        {lo.planItemLabel && ` · ${lo.planItemLabel}`}
                        {" · "}Ordered {formatDate(lo.orderedDate)}
                        {lo.receivedDate && ` · Received ${formatDate(lo.receivedDate)}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold tabular-nums">
                        ₹{lo.totalAmount.toLocaleString("en-IN")}
                      </span>
                      {lo.rateAdjustment !== 0 && (
                        <div className="text-xs text-amber-600">
                          {lo.rateAdjustment > 0 ? "+" : ""}₹{lo.rateAdjustment.toLocaleString("en-IN")} adj.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 5. Treatment History (kept — "what was done?") */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Treatment History</h3>
          <div className="inline-flex items-center rounded-md border bg-muted p-0.5 text-xs">
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-2.5 py-1 rounded-sm transition-colors ${
                viewMode === "timeline" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("log")}
              className={`px-2.5 py-1 rounded-sm transition-colors ${
                viewMode === "log" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Visit Log
            </button>
          </div>
        </div>
        {viewMode === "timeline" ? (
          <TreatmentTimeline
            visits={data.topLevelVisits}
            showInternalCosts={data.showInternalCosts}
            patientId={patient.id}
            activeVisitId={activeVisitId || undefined}
            onAddFollowUp={!isDoctor ? openFollowUp : undefined}
            visitPlanMap={visitPlanMap}
          />
        ) : (
          <VisitLogTable
            visits={data.topLevelVisits}
            showInternalCosts={data.showInternalCosts}
            onSelectVisit={setSelectedVisit}
          />
        )}
      </section>

      {/* 5. Clinical Notepad (moved down — reference, not primary) */}
      {(data.clinicalNotes.length > 0 || currentUser.permissionLevel >= 3) && (
        <section>
          <ClinicalNotepad
            patientId={patient.id}
            notes={data.clinicalNotes}
            chains={data.treatmentChains.map(c => ({ id: c.id, title: c.title }))}
            canAddNotes={currentUser.permissionLevel >= 3}
            currentDoctorName={currentUser.name}
          />
        </section>
      )}

      {/* 6. Files & Images (Task 3A: Collapsible, default closed) */}
      <section>
        <button
          type="button"
          onClick={() => setFilesExpanded(!filesExpanded)}
          className="flex items-center gap-1.5 mb-2 group"
        >
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${filesExpanded ? "rotate-90" : ""}`} />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide group-hover:text-foreground transition-colors">
            Files ({data.files.length})
          </h3>
        </button>
        {filesExpanded && (
          <div className="space-y-4">
            <FileUpload patientId={patient.id} />
            <FileGallery
              files={data.files}
              canDelete={currentUser.permissionLevel <= 2}
            />
          </div>
        )}
      </section>

      {/* 7. Patient Information (Task 3A: Collapsible, default closed) */}
      <section>
        <button
          type="button"
          onClick={() => setInfoExpanded(!infoExpanded)}
          className="flex items-center gap-1.5 mb-2 group"
        >
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${infoExpanded ? "rotate-90" : ""}`} />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide group-hover:text-foreground transition-colors">
            Patient Information
          </h3>
        </button>
        {infoExpanded && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow label="Patient Code" value={patient.code ? `#${patient.code}` : null} />
                  <InfoRow label="Father/Husband" value={patient.fatherHusbandName} />
                  <InfoRow label="Date of Birth" value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null} />
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
                <DeletePatientButton patientId={patient.id} patientName={toTitleCase(patient.name)} />
              </div>
            )}
          </>
        )}
      </section>

      {/* Quick Visit Sheet — hidden for doctors (they use appointment workflow) */}
      {!isDoctor && (
        <QuickVisitSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          patientId={patient.id}
          patientName={toTitleCase(patient.name)}
          patientCode={patient.code}
          operations={data.operations}
          doctors={data.doctors}
          labs={data.labs}
          permissionLevel={currentUser.permissionLevel}
          isSuperUser={currentUser.isSuperUser}
          currentDoctorId={currentUser.id}
          followUpContext={followUpContext}
          appointmentId={todayAppt?.status === "ARRIVED" ? todayAppt.id : undefined}
          totalPaid={data.totalPaid}
        />
      )}

      {/* Collect Payment Dialog */}
      {data.canCollect && (
        <CollectPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          patientId={patient.id}
          patientName={toTitleCase(patient.name)}
          patientCode={patient.code}
          totalCollected={data.totalCollected}
          totalBilled={data.totalBilled}
          suggestedAmount={data.totalBilled - data.totalCollected > 0 ? data.totalBilled - data.totalCollected : undefined}
        />
      )}

      {/* Schedule Follow-Up Dialog */}
      {!isDoctor && (
        <ScheduleFollowUpDialog
          key={scheduleDefaults?.planItemId || "default"}
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          patientId={patient.id}
          patientName={toTitleCase(patient.name)}
          patientCode={patient.code}
          doctors={data.doctors}
          defaults={scheduleDefaults}
          onCollectAdvance={data.canCollect ? () => setPaymentDialogOpen(true) : undefined}
        />
      )}

      {/* InlinePlanSheet for adding plans to active chains */}
      {currentUser.permissionLevel === 3 && planSheetChainId && (
        <InlinePlanSheet
          key={planSheetChainId}
          open={planSheetOpen}
          onOpenChange={setPlanSheetOpen}
          patientId={patient.id}
          mode="add-to-chain"
          chainId={planSheetChainId}
          chainTitle={planSheetChainTitle}
          chainTeeth={planSheetChainTeeth}
          allOperations={data.operations.map((o) => ({
            id: o.id,
            name: o.name,
            category: o.category,
            stepCount: 0,
            defaultMinFee: o.defaultMinFee,
          }))}
          allDoctors={data.doctors.map((d) => ({ id: d.id, name: d.name }))}
          defaultDoctorId={currentUser.id}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
