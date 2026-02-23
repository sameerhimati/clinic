"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, ChevronLeft, ChevronRight, MoreVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { classifyTimeSlot, timeSlotSortKey, PERIOD_ORDER, type TimePeriod } from "@/lib/time-slots";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
import { StatusBadge, STATUS_CONFIG } from "@/components/status-badge";

type Appointment = {
  id: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  patientSalutation: string | null;
  doctorId: number | null;
  doctorName: string | null;
  visitId: number | null;
  timeSlot: string | null;
  status: string;
  reason: string | null;
  notes: string | null;
  cancelReason: string | null;
};

type ColumnDoctor = { id: number; name: string };

const VALID_TRANSITIONS: Record<string, { status: string; label: string }[]> = {
  SCHEDULED: [
    { status: "ARRIVED", label: "Mark Arrived" },
    { status: "CANCELLED", label: "Cancel" },
    { status: "NO_SHOW", label: "Mark No Show" },
  ],
  ARRIVED: [
    { status: "IN_PROGRESS", label: "Start Treatment" },
    { status: "CANCELLED", label: "Cancel" },
  ],
  IN_PROGRESS: [
    { status: "COMPLETED", label: "Mark Complete" },
    { status: "CANCELLED", label: "Cancel" },
  ],
};

function AppointmentCard({
  appt,
  compact,
  onStatusChange,
}: {
  appt: Appointment;
  compact?: boolean;
  onStatusChange: (id: number, status: string, reason?: string) => void;
}) {
  const transitions = VALID_TRANSITIONS[appt.status] || [];
  const isCancelled = appt.status === "CANCELLED";
  const abbreviatedName =
    appt.patientName.length > 18
      ? appt.patientName.slice(0, 16) + "..."
      : appt.patientName;

  return (
    <div
      className={`rounded-md border p-2 text-xs space-y-1 ${
        isCancelled ? "opacity-60" : "bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <Link
            href={`/patients/${appt.patientId}`}
            className="font-mono text-muted-foreground hover:underline"
          >
            #{appt.patientCode}
          </Link>{" "}
          <span className={`font-medium ${isCancelled ? "line-through" : ""}`}>
            {compact ? abbreviatedName : appt.patientName}
          </span>
        </div>
        {transitions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="shrink-0 rounded p-0.5 hover:bg-accent">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {transitions.map((t) => (
                <DropdownMenuItem
                  key={t.status}
                  onClick={() => {
                    if (t.status === "CANCELLED") {
                      onStatusChange(appt.id, "CANCEL_PROMPT");
                    } else {
                      onStatusChange(appt.id, t.status);
                    }
                  }}
                >
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {appt.timeSlot && (
        <div className="text-muted-foreground">{appt.timeSlot}</div>
      )}
      {appt.reason && (
        <div className="text-muted-foreground truncate">{appt.reason}</div>
      )}
      <div className="flex items-center gap-1 flex-wrap">
        <StatusBadge status={appt.status} />
        {appt.status === "ARRIVED" && (
          <Link
            href={`/visits/new?patientId=${appt.patientId}&appointmentId=${appt.id}${appt.doctorId ? `&doctorId=${appt.doctorId}` : ""}`}
            className="text-[10px] text-primary hover:underline font-medium"
          >
            Create Visit →
          </Link>
        )}
      </div>
      {appt.cancelReason && (
        <div className="text-muted-foreground italic">
          Reason: {appt.cancelReason}
        </div>
      )}
    </div>
  );
}

export function AppointmentDayView({
  dateStr,
  appointments,
  columnDoctors,
  currentUserId,
  permissionLevel,
}: {
  dateStr: string;
  appointments: Appointment[];
  columnDoctors: ColumnDoctor[];
  currentUserId: number;
  permissionLevel: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelDialogId, setCancelDialogId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showAll, setShowAll] = useState(false);

  const isDoctor = permissionLevel === 3;

  // Date navigation helpers
  const date = new Date(dateStr + "T00:00:00");
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = dateStr === todayStr;

  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const displayDate = date.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Status summary
  const counts: Record<string, number> = {};
  for (const a of appointments) {
    counts[a.status] = (counts[a.status] || 0) + 1;
  }

  // Group by period and doctor
  const grouped = new Map<TimePeriod, Map<number | null, Appointment[]>>();
  for (const period of PERIOD_ORDER) {
    grouped.set(period, new Map());
  }

  for (const appt of appointments) {
    const period = classifyTimeSlot(appt.timeSlot);
    const periodMap = grouped.get(period)!;
    const key = appt.doctorId;
    if (!periodMap.has(key)) periodMap.set(key, []);
    periodMap.get(key)!.push(appt);
  }

  // Sort appointments within each cell by time
  for (const periodMap of grouped.values()) {
    for (const appts of periodMap.values()) {
      appts.sort((a, b) => timeSlotSortKey(a.timeSlot) - timeSlotSortKey(b.timeSlot));
    }
  }

  // Determine which periods have appointments
  const activePeriods = PERIOD_ORDER.filter((p) => {
    const periodMap = grouped.get(p)!;
    return Array.from(periodMap.values()).some((arr) => arr.length > 0);
  });

  // Unassigned appointments
  const unassigned = appointments.filter((a) => !a.doctorId);

  // Mobile filter for doctors
  const mobileAppointments =
    isDoctor && !showAll
      ? appointments.filter((a) => a.doctorId === currentUserId)
      : appointments;

  // Group mobile appointments by period
  const mobilePeriods = new Map<TimePeriod, Appointment[]>();
  for (const appt of mobileAppointments) {
    const period = classifyTimeSlot(appt.timeSlot);
    if (!mobilePeriods.has(period)) mobilePeriods.set(period, []);
    mobilePeriods.get(period)!.push(appt);
  }
  for (const appts of mobilePeriods.values()) {
    appts.sort((a, b) => timeSlotSortKey(a.timeSlot) - timeSlotSortKey(b.timeSlot));
  }

  function handleStatusChange(appointmentId: number, status: string) {
    if (status === "CANCEL_PROMPT") {
      setCancelDialogId(appointmentId);
      setCancelReason("");
      return;
    }

    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, status);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  function handleCancelConfirm() {
    if (!cancelDialogId || !cancelReason.trim()) return;
    startTransition(async () => {
      try {
        await updateAppointmentStatus(cancelDialogId, "CANCELLED", cancelReason.trim());
        setCancelDialogId(null);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to cancel");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-2xl font-bold">Appointments</h2>
        </div>
        <Button asChild>
          <Link href="/appointments/new">
            <Plus className="mr-2 h-4 w-4" />
            Schedule
          </Link>
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/appointments?date=${fmtDate(prevDate)}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="font-medium text-sm">{displayDate}</span>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/appointments?date=${fmtDate(nextDate)}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
        {!isToday && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/appointments">Today</Link>
          </Button>
        )}
        <input
          type="date"
          value={dateStr}
          onChange={(e) => {
            if (e.target.value) router.push(`/appointments?date=${e.target.value}`);
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>

      {/* Summary bar */}
      {appointments.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{appointments.length} total</Badge>
          {counts.SCHEDULED && (
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              {counts.SCHEDULED} scheduled
            </Badge>
          )}
          {counts.ARRIVED && (
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              {counts.ARRIVED} arrived
            </Badge>
          )}
          {counts.IN_PROGRESS && (
            <Badge variant="outline" className="border-blue-400 text-blue-800">
              {counts.IN_PROGRESS} in progress
            </Badge>
          )}
          {counts.COMPLETED && (
            <Badge variant="outline" className="border-green-300 text-green-700">
              {counts.COMPLETED} completed
            </Badge>
          )}
          {counts.CANCELLED && (
            <Badge variant="outline" className="border-gray-300 text-gray-500">
              {counts.CANCELLED} cancelled
            </Badge>
          )}
          {counts.NO_SHOW && (
            <Badge variant="outline" className="border-red-300 text-red-700">
              {counts.NO_SHOW} no-show
            </Badge>
          )}
        </div>
      )}

      {appointments.length === 0 && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No appointments for this date.{" "}
          <Link href={`/appointments/new?date=${dateStr}`} className="text-primary hover:underline">
            Schedule one
          </Link>
        </div>
      )}

      {/* === Desktop Timetable === */}
      {appointments.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <div
            className="min-w-fit"
            style={{
              display: "grid",
              gridTemplateColumns: `100px repeat(${columnDoctors.length}, minmax(180px, 1fr))`,
            }}
          >
            {/* Header row */}
            <div className="border-b bg-muted/50 px-2 py-2 text-xs font-medium text-muted-foreground sticky left-0 bg-background z-10">
              Time
            </div>
            {columnDoctors.map((doc) => (
              <div
                key={doc.id}
                className={`border-b border-l px-2 py-2 text-xs font-medium text-center truncate ${
                  isDoctor && doc.id === currentUserId
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted/50"
                }`}
              >
                Dr. {doc.name}
              </div>
            ))}

            {/* Period rows */}
            {activePeriods.map((period) => {
              const periodMap = grouped.get(period)!;
              return (
                <div key={period} className="contents">
                  {/* Period label */}
                  <div className="border-b px-2 py-3 text-xs font-semibold text-muted-foreground sticky left-0 bg-background z-10 flex items-start">
                    {period}
                  </div>
                  {/* Doctor cells */}
                  {columnDoctors.map((doc) => {
                    const cellAppts = periodMap.get(doc.id) || [];
                    return (
                      <div
                        key={doc.id}
                        className={`border-b border-l p-1.5 min-h-[60px] space-y-1.5 ${
                          isDoctor && doc.id === currentUserId
                            ? "bg-primary/5"
                            : ""
                        }`}
                      >
                        {cellAppts.map((appt) => (
                          <AppointmentCard
                            key={appt.id}
                            appt={appt}
                            compact
                            onStatusChange={handleStatusChange}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Unassigned section */}
          {unassigned.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Unassigned ({unassigned.length})
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {unassigned.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === Mobile Card List === */}
      {appointments.length > 0 && (
        <div className="md:hidden space-y-4">
          {isDoctor && (
            <div className="flex items-center gap-2">
              <Button
                variant={showAll ? "outline" : "default"}
                size="sm"
                onClick={() => setShowAll(false)}
              >
                My Appointments
              </Button>
              <Button
                variant={showAll ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAll(true)}
              >
                Show All
              </Button>
            </div>
          )}

          {mobileAppointments.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No appointments assigned to you today
            </div>
          )}

          {PERIOD_ORDER.map((period) => {
            const periodAppts = mobilePeriods.get(period);
            if (!periodAppts || periodAppts.length === 0) return null;
            return (
              <div key={period}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {period}
                </h3>
                <div className="space-y-2">
                  {periodAppts.map((appt) => (
                    <div
                      key={appt.id}
                      className="rounded-lg border p-3 text-sm space-y-1"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          {appt.timeSlot && (
                            <span className="text-muted-foreground mr-2">
                              {appt.timeSlot}
                            </span>
                          )}
                          {appt.doctorName && (
                            <span className="text-muted-foreground">
                              Dr. {appt.doctorName}
                            </span>
                          )}
                        </div>
                        <StatusBadge status={appt.status} />
                      </div>
                      <div>
                        <Link
                          href={`/patients/${appt.patientId}`}
                          className="font-medium hover:underline"
                        >
                          <span className="font-mono text-muted-foreground mr-1">
                            #{appt.patientCode}
                          </span>
                          {appt.patientName}
                        </Link>
                      </div>
                      {appt.reason && (
                        <div className="text-muted-foreground">{appt.reason}</div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        {(VALID_TRANSITIONS[appt.status] || []).map((t) => (
                          <Button
                            key={t.status}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              if (t.status === "CANCELLED") {
                                handleStatusChange(appt.id, "CANCEL_PROMPT");
                              } else {
                                handleStatusChange(appt.id, t.status);
                              }
                            }}
                          >
                            {t.label}
                          </Button>
                        ))}
                        {appt.status === "ARRIVED" && (
                          <Button variant="default" size="sm" className="text-xs h-7" asChild>
                            <Link
                              href={`/visits/new?patientId=${appt.patientId}&appointmentId=${appt.id}${appt.doctorId ? `&doctorId=${appt.doctorId}` : ""}`}
                            >
                              Create Visit →
                            </Link>
                          </Button>
                        )}
                      </div>
                      {appt.cancelReason && (
                        <div className="text-xs text-muted-foreground italic">
                          Cancel reason: {appt.cancelReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel dialog */}
      <Dialog
        open={cancelDialogId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelDialogId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Reason for cancellation <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogId(null)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={!cancelReason.trim() || isPending}
            >
              {isPending ? "Cancelling..." : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isPending && (
        <div className="fixed inset-0 bg-background/50 z-50 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Updating...</div>
        </div>
      )}
    </div>
  );
}
