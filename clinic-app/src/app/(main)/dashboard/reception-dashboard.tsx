"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UserPlus,
  CalendarDays,
  Phone,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
import { StatusBadge } from "@/components/status-badge";
import { CollectPaymentDialog } from "@/components/collect-payment-dialog";
import { ScheduleFollowUpDialog, type ScheduleDefaults } from "@/components/schedule-followup-dialog";
import { PrescriptionQueue } from "@/components/prescription-queue";
import { PendingLabOrdersWidget } from "@/components/pending-lab-orders-widget";

type AppointmentData = {
  id: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  doctorName: string | null;
  visitId: number | null;
  timeSlot: string | null;
  status: string;
  reason: string | null;
  medicalAlerts: string[];
  totalCollected: number | null;
  totalBilled: number | null;
};

type FollowUpItem = {
  patientId: number;
  patientCode: number | null;
  patientName: string;
  phone: string | null;
  treatmentTitle: string;
  nextStep: string;
  daysUntilDue: number;
  planId: number;
};

type PendingPayment = {
  patientId: number;
  patientCode: number | null;
  patientName: string;
  totalCollected: number;
  totalBilled: number;
  operationName?: string | null;
  doctorName?: string | null;
};

type PrescriptionData = {
  id: number;
  patient: { id: number; code: number | null; name: string };
  doctor: { name: string };
  visit: { id: number; caseNo: number | null };
  items: { id: number }[];
  createdAt: Date;
};

type LabNudge = {
  planItemId: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  planTitle: string;
  stepLabel: string;
  toothNumbers: string | null;
  stepCount?: number;
};

type PendingLabOrder = {
  id: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  labName: string;
  materialName: string;
  daysSinceOrdered: number;
  expectedDate: string | null;
  totalAmount: number;
};

type LabData = {
  id: number;
  name: string;
  rates: { id: number; itemName: string; rate: number }[];
};

export type ReceptionDashboardProps = {
  greeting: string;
  userName: string;
  dateDisplay: string;
  todayVisits: number;
  todayCollections: number;
  totalOutstanding: number;
  appointments: AppointmentData[];
  followUpQueue: FollowUpItem[];
  readyForCheckout: PendingPayment[];
  prescriptions: PrescriptionData[];
  doctors: { id: number; name: string }[];
  labNudges: LabNudge[];
  pendingLabOrders: PendingLabOrder[];
  labs: LabData[];
  defaultAdvance?: number;
};

const STATUS_BORDER: Record<string, string> = {
  SCHEDULED: "border-l-blue-400",
  ARRIVED: "border-l-amber-400",
  IN_PROGRESS: "border-l-blue-600",
  COMPLETED: "border-l-green-400",
};

export function ReceptionDashboard({
  greeting,
  userName,
  dateDisplay,
  todayVisits,
  todayCollections,
  totalOutstanding,
  appointments,
  followUpQueue,
  readyForCheckout,
  prescriptions,
  doctors,
  labNudges,
  pendingLabOrders,
  labs,
  defaultAdvance = 500,
}: ReceptionDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Collapsible sections
  const [followUpExpanded, setFollowUpExpanded] = useState(true);
  const [pendingExpanded, setPendingExpanded] = useState(true);

  // Collect Payment Dialog
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectAdvanceAmount, setCollectAdvanceAmount] = useState<number | undefined>();
  const [collectTarget, setCollectTarget] = useState<{
    patientId: number;
    patientName: string;
    patientCode: number | null;
    totalCollected: number;
    totalBilled: number;
  } | null>(null);

  // Schedule Follow-Up Dialog
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<{
    patientId: number;
    patientName: string;
    patientCode: number | null;
    defaults?: ScheduleDefaults;
  } | null>(null);

  function openCollect(p: { patientId: number; patientName: string; patientCode: number | null; totalCollected: number; totalBilled: number }) {
    setCollectTarget(p);
    setCollectOpen(true);
  }

  function openSchedule(p: { patientId: number; patientName: string; patientCode: number | null }, defaults?: ScheduleDefaults) {
    setScheduleTarget({ ...p, defaults });
    setScheduleOpen(true);
  }

  function handleStatusChange(appointmentId: number, status: string) {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, status);
        router.refresh();
        toast.success(status === "ARRIVED" ? "Checked in" : "Status updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const apptCounts: Record<string, number> = {};
  for (const a of appointments) {
    apptCounts[a.status] = (apptCounts[a.status] || 0) + 1;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold">{greeting}, {userName}</h2>
          <span className="text-sm text-muted-foreground">{dateDisplay}</span>
        </div>
        {/* Inline stats */}
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm">
            {todayVisits} visits today
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm text-green-700">
            {"\u20B9"}{todayCollections.toLocaleString("en-IN")} collected
          </div>
          {totalOutstanding > 0 && (
            <Link
              href="/reports/outstanding"
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm text-destructive hover:bg-accent transition-colors"
            >
              {"\u20B9"}{totalOutstanding.toLocaleString("en-IN")} outstanding
            </Link>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/patients/new">
            <UserPlus className="mr-2 h-4 w-4" />
            New Patient
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/appointments/new">
            <CalendarDays className="mr-2 h-4 w-4" />
            Schedule
          </Link>
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT — Today's Appointments (spans 2) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Today{"\u2019"}s Appointments
                <Badge variant="secondary" className="text-xs">{appointments.length}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/appointments">View All →</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <>
                  {/* Status summary */}
                  <div className="flex flex-wrap gap-2 mb-3 text-xs">
                    {apptCounts.SCHEDULED && (
                      <Badge variant="outline" className="border-blue-300 text-blue-700">
                        {apptCounts.SCHEDULED} scheduled
                      </Badge>
                    )}
                    {apptCounts.ARRIVED && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700">
                        {apptCounts.ARRIVED} arrived
                      </Badge>
                    )}
                    {apptCounts.IN_PROGRESS && (
                      <Badge variant="outline" className="border-blue-400 text-blue-800">
                        {apptCounts.IN_PROGRESS} in progress
                      </Badge>
                    )}
                    {apptCounts.COMPLETED && (
                      <Badge variant="outline" className="border-green-300 text-green-700">
                        {apptCounts.COMPLETED} completed
                      </Badge>
                    )}
                  </div>
                  <div className="divide-y">
                    {appointments.map((appt) => (
                      <div
                        key={appt.id}
                        className={`flex items-center justify-between py-3 border-l-4 pl-4 -ml-6 cursor-pointer hover:bg-accent/50 transition-colors ${STATUS_BORDER[appt.status] || ""}`}
                        onClick={() => router.push(`/patients/${appt.patientId}`)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">#{appt.patientCode}</span>
                            <span className="truncate">{appt.patientName}</span>
                          </div>
                          {appt.medicalAlerts.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                              <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
                              {appt.medicalAlerts.map((a) => (
                                <span key={a} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0 leading-4 font-medium">
                                  {a}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            {appt.timeSlot && <span>{appt.timeSlot} · </span>}
                            {appt.doctorName && <span>Dr. {appt.doctorName} · </span>}
                            {appt.reason || "Appointment"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* Financial summary */}
                          {appt.totalBilled != null && appt.totalBilled > 0 && (() => {
                            const collected = appt.totalCollected ?? 0;
                            const outstanding = appt.totalBilled - collected;
                            return (
                              <div className="text-right">
                                {outstanding > 0 ? (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                    {"\u20B9"}{outstanding.toLocaleString("en-IN")} due
                                  </span>
                                ) : outstanding < 0 ? (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                    {"\u20B9"}{Math.abs(outstanding).toLocaleString("en-IN")} credit
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                    Paid up
                                  </span>
                                )}
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {"\u20B9"}{collected.toLocaleString("en-IN")} of {"\u20B9"}{appt.totalBilled.toLocaleString("en-IN")}
                                </div>
                              </div>
                            );
                          })()}
                          {/* Collect button for patients with outstanding */}
                          {appt.totalBilled != null && appt.totalBilled > 0 && (appt.totalBilled - (appt.totalCollected ?? 0)) > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => openCollect({
                                patientId: appt.patientId,
                                patientName: appt.patientName,
                                patientCode: appt.patientCode,
                                totalCollected: appt.totalCollected ?? 0,
                                totalBilled: appt.totalBilled!,
                              })}
                            >
                              <IndianRupee className="mr-1 h-3 w-3" />
                              Collect
                            </Button>
                          )}
                          {/* Status actions */}
                          {appt.status === "SCHEDULED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleStatusChange(appt.id, "ARRIVED")}
                              disabled={isPending}
                            >
                              Check In
                            </Button>
                          )}
                          {(appt.status === "ARRIVED" || appt.status === "IN_PROGRESS" || appt.status === "COMPLETED") && (
                            <StatusBadge status={appt.status} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  No appointments today.{" "}
                  <Link href="/appointments/new" className="text-primary hover:underline">Schedule one</Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prescription Queue */}
          <PrescriptionQueue prescriptions={prescriptions} />
        </div>

        {/* RIGHT column */}
        <div className="space-y-4">
          {/* Ready for Checkout */}
          {readyForCheckout.length > 0 && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Ready for Checkout
                  <Badge variant="secondary" className="text-xs">{readyForCheckout.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-green-100">
                  {readyForCheckout.map((p) => {
                    const outstanding = p.totalBilled - p.totalCollected;
                    return (
                      <div key={p.patientId} className="flex items-center justify-between py-2.5 gap-3">
                        <div className="min-w-0 flex-1">
                          <Link href={`/patients/${p.patientId}/checkout`} className="font-medium hover:underline flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">#{p.patientCode}</span>
                            <span className="truncate">{p.patientName}</span>
                          </Link>
                          {(p.operationName || p.doctorName) && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {p.operationName || "Visit"}
                              {p.doctorName && ` \u00b7 Dr. ${p.doctorName}`}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {outstanding > 0 ? (
                            <>
                              <span className="text-xs font-semibold text-red-700">
                                {"\u20B9"}{outstanding.toLocaleString("en-IN")} due
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => openCollect(p)}
                              >
                                Collect
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                              <Link href={`/patients/${p.patientId}/checkout`}>
                                Checkout {"\u2192"}
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-Up Queue */}
          {followUpQueue.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2">
                <button
                  type="button"
                  onClick={() => setFollowUpExpanded(!followUpExpanded)}
                  className="flex items-center justify-between w-full"
                >
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-amber-600" />
                    Follow-Up Queue
                    <span className="text-xs font-normal text-muted-foreground">({followUpQueue.length})</span>
                  </CardTitle>
                  {followUpExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
              </CardHeader>
              {followUpExpanded && (
                <CardContent className="pt-0">
                  <div className="divide-y">
                    {followUpQueue.slice(0, 8).map((item) => (
                      <div key={`${item.patientId}-${item.planId}`} className="py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <Link href={`/patients/${item.patientId}`} className="font-medium text-sm hover:underline truncate flex items-center gap-1.5">
                            <span className="font-mono text-xs text-muted-foreground">#{item.patientCode}</span>
                            <span className="truncate">{item.patientName}</span>
                          </Link>
                          {item.daysUntilDue < 0 && (
                            <Badge variant="outline" className="text-xs px-1 py-0 text-red-600 border-red-200 bg-red-50 shrink-0">
                              {Math.abs(item.daysUntilDue)}d overdue
                            </Badge>
                          )}
                          {item.daysUntilDue === 0 && (
                            <Badge variant="outline" className="text-xs px-1 py-0 text-amber-600 border-amber-200 bg-amber-50 shrink-0">
                              Today
                            </Badge>
                          )}
                          {item.daysUntilDue > 0 && (
                            <Badge variant="outline" className="text-xs px-1 py-0 text-blue-600 border-blue-200 bg-blue-50 shrink-0">
                              {item.daysUntilDue}d
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.treatmentTitle} — <span className="font-medium text-foreground">{item.nextStep}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {item.phone && (
                            <span className="text-xs text-muted-foreground">
                              <Phone className="inline h-3 w-3 mr-0.5" />{item.phone}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs ml-auto"
                            onClick={() => openSchedule(
                              { patientId: item.patientId, patientName: item.patientName, patientCode: item.patientCode },
                              { reason: item.nextStep }
                            )}
                          >
                            <CalendarDays className="mr-1 h-3 w-3" />
                            Schedule
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Lab Orders Widget */}
          <PendingLabOrdersWidget
            nudges={labNudges}
            pendingOrders={pendingLabOrders}
            labs={labs}
          />

          {/* Pending Payments (patients with negative escrow from today's appts) */}
          {(() => {
            const duePats = appointments.filter((a) => a.totalBilled != null && a.totalBilled > 0 && (a.totalBilled - (a.totalCollected ?? 0)) > 0);
            if (duePats.length === 0) return null;
            return (
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <button
                    type="button"
                    onClick={() => setPendingExpanded(!pendingExpanded)}
                    className="flex items-center justify-between w-full"
                  >
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-red-600" />
                      Pending Payments
                      <span className="text-xs font-normal text-muted-foreground">({duePats.length})</span>
                    </CardTitle>
                    {pendingExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </CardHeader>
                {pendingExpanded && (
                  <CardContent className="pt-0">
                    <div className="divide-y">
                      {duePats.map((appt) => {
                        const outstanding = appt.totalBilled! - (appt.totalCollected ?? 0);
                        return (
                          <div key={appt.id} className="flex items-center justify-between py-2.5 gap-2">
                            <Link href={`/patients/${appt.patientId}`} className="font-medium text-sm hover:underline truncate flex items-center gap-1.5">
                              <span className="font-mono text-xs text-muted-foreground">#{appt.patientCode}</span>
                              <span className="truncate">{appt.patientName}</span>
                            </Link>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-semibold text-red-700">
                                  {"\u20B9"}{outstanding.toLocaleString("en-IN")}
                                </span>
                                <div className="text-[10px] text-muted-foreground">
                                  of {"\u20B9"}{appt.totalBilled!.toLocaleString("en-IN")}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => openCollect({
                                  patientId: appt.patientId,
                                  patientName: appt.patientName,
                                  patientCode: appt.patientCode,
                                  totalCollected: appt.totalCollected ?? 0,
                                  totalBilled: appt.totalBilled!,
                                })}
                              >
                                Collect
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })()}
        </div>
      </div>

      {/* Collect Payment Dialog */}
      {collectTarget && (
        <CollectPaymentDialog
          open={collectOpen}
          onOpenChange={(open) => {
            setCollectOpen(open);
            if (!open) { setCollectTarget(null); setCollectAdvanceAmount(undefined); }
          }}
          patientId={collectTarget.patientId}
          patientName={collectTarget.patientName}
          patientCode={collectTarget.patientCode}
          totalCollected={collectTarget.totalCollected}
          totalBilled={collectTarget.totalBilled}
          suggestedAmount={collectAdvanceAmount}
        />
      )}

      {/* Schedule Follow-Up Dialog */}
      {scheduleTarget && scheduleTarget.patientId > 0 && (
        <ScheduleFollowUpDialog
          key={scheduleTarget.patientId}
          open={scheduleOpen}
          onOpenChange={(open) => {
            setScheduleOpen(open);
            if (!open) setScheduleTarget(null);
          }}
          patientId={scheduleTarget.patientId}
          patientName={scheduleTarget.patientName}
          patientCode={scheduleTarget.patientCode}
          doctors={doctors}
          defaults={scheduleTarget.defaults}
          onCollectAdvance={() => {
            setCollectTarget({
              patientId: scheduleTarget.patientId,
              patientName: scheduleTarget.patientName,
              patientCode: scheduleTarget.patientCode,
              totalCollected: 0,
              totalBilled: 0,
            });
            setCollectAdvanceAmount(defaultAdvance);
            setCollectOpen(true);
          }}
        />
      )}
    </div>
  );
}
