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
import { StatusBadge } from "@/components/status-badge";

type Appointment = {
  id: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  patientSalutation: string | null;
  doctorId: number | null;
  doctorName: string | null;
  visitId: number | null;
  roomId: number | null;
  roomName: string | null;
  timeSlot: string | null;
  status: string;
  reason: string | null;
  notes: string | null;
  cancelReason: string | null;
};

type ColumnDoctor = { id: number; name: string };
type ColumnRoom = { id: number; name: string };

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

// Primary action for each status (shown as inline button)
function PrimaryAction({
  appt,
  onStatusChange,
}: {
  appt: Appointment;
  onStatusChange: (id: number, status: string) => void;
}) {
  if (appt.status === "SCHEDULED") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={(e) => {
          e.stopPropagation();
          onStatusChange(appt.id, "ARRIVED");
        }}
      >
        Arrived
      </Button>
    );
  }
  if (appt.status === "ARRIVED") {
    return (
      <Button size="sm" variant="default" className="h-7 text-xs" asChild>
        <Link
          href={`/visits/new?patientId=${appt.patientId}&appointmentId=${appt.id}${appt.doctorId ? `&doctorId=${appt.doctorId}` : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          Start Visit
        </Link>
      </Button>
    );
  }
  if (appt.status === "IN_PROGRESS" && appt.visitId) {
    return (
      <Button size="sm" variant="default" className="h-7 text-xs" asChild>
        <Link
          href={`/visits/${appt.visitId}/examine`}
          onClick={(e) => e.stopPropagation()}
        >
          Examine
        </Link>
      </Button>
    );
  }
  return null;
}

// Secondary actions in dropdown (Cancel, No Show, etc. — minus the primary)
function SecondaryActions({
  appt,
  onStatusChange,
}: {
  appt: Appointment;
  onStatusChange: (id: number, status: string) => void;
}) {
  const transitions = VALID_TRANSITIONS[appt.status] || [];
  // Filter out the primary action
  const secondary = transitions.filter((t) => {
    if (appt.status === "SCHEDULED" && t.status === "ARRIVED") return false;
    if (appt.status === "ARRIVED" && t.status === "IN_PROGRESS") return false;
    if (appt.status === "IN_PROGRESS" && t.status === "COMPLETED") return false;
    return true;
  });

  if (secondary.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="shrink-0 rounded p-1.5 hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {secondary.map((t) => (
          <DropdownMenuItem
            key={t.status}
            onClick={(e) => {
              e.stopPropagation();
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
  );
}

function AppointmentCard({
  appt,
  compact,
  showDoctorName,
  onStatusChange,
}: {
  appt: Appointment;
  compact?: boolean;
  showDoctorName?: boolean;
  onStatusChange: (id: number, status: string, reason?: string) => void;
}) {
  const router = useRouter();
  const isCancelled = appt.status === "CANCELLED";
  const isTerminal = isCancelled || appt.status === "NO_SHOW";
  const abbreviatedName =
    appt.patientName.length > 18
      ? appt.patientName.slice(0, 16) + "..."
      : appt.patientName;

  return (
    <div
      className={`rounded-md border p-2 text-xs space-y-1 transition-colors bg-card ${
        isTerminal ? "opacity-60" : "cursor-pointer hover:border-primary/50"
      }`}
      onClick={() => {
        if (!isTerminal) {
          router.push(`/patients/${appt.patientId}`);
        }
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <span className="font-mono text-muted-foreground">
            #{appt.patientCode}
          </span>{" "}
          <span className={`font-medium ${isCancelled ? "line-through" : ""}`}>
            {compact ? abbreviatedName : appt.patientName}
          </span>
        </div>
        <SecondaryActions appt={appt} onStatusChange={onStatusChange} />
      </div>
      {appt.timeSlot && (
        <div className="text-muted-foreground">{appt.timeSlot}</div>
      )}
      {showDoctorName && appt.doctorName && (
        <div className="text-muted-foreground">Dr. {appt.doctorName}</div>
      )}
      {appt.reason && (
        <div className="text-muted-foreground truncate">{appt.reason}</div>
      )}
      <div className="flex items-center gap-1 flex-wrap">
        <StatusBadge status={appt.status} />
        <PrimaryAction appt={appt} onStatusChange={onStatusChange} />
      </div>
      {appt.cancelReason && (
        <div className="text-muted-foreground italic">
          Reason: {appt.cancelReason}
        </div>
      )}
    </div>
  );
}

type ViewMode = "doctor" | "room";

export function AppointmentDayView({
  dateStr,
  appointments,
  columnDoctors,
  columnRooms,
  currentUserId,
  permissionLevel,
}: {
  dateStr: string;
  appointments: Appointment[];
  columnDoctors: ColumnDoctor[];
  columnRooms: ColumnRoom[];
  currentUserId: number;
  permissionLevel: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelDialogId, setCancelDialogId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("room");

  const isDoctor = permissionLevel === 3;

  // Date navigation helpers — locale-safe, no .toISOString() (avoids UTC shift)
  function addDays(ds: string, n: number): string {
    const [y, m, d] = ds.split("-").map(Number);
    const dt = new Date(y, m - 1, d + n);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }

  const prevDateStr = addDays(dateStr, -1);
  const nextDateStr = addDays(dateStr, 1);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isToday = dateStr === todayStr;

  const [dy, dm, dd] = dateStr.split("-").map(Number);
  const displayDate = new Date(dy, dm - 1, dd).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Doctor filtering (Phase 6)
  const filteredAppointments =
    isDoctor && !showAll
      ? appointments.filter((a) => a.doctorId === currentUserId)
      : appointments;

  // Status summary (based on filtered)
  const counts: Record<string, number> = {};
  for (const a of filteredAppointments) {
    counts[a.status] = (counts[a.status] || 0) + 1;
  }

  // Column source depends on view mode
  const columns: { id: number; name: string }[] =
    viewMode === "doctor"
      ? isDoctor && !showAll
        ? columnDoctors.filter((d) => d.id === currentUserId)
        : columnDoctors
      : columnRooms;

  const columnLabel = (col: { id: number; name: string }) =>
    viewMode === "doctor" ? `Dr. ${col.name}` : col.name;

  const groupKey = (appt: Appointment): number | null =>
    viewMode === "doctor" ? appt.doctorId : appt.roomId;

  // Group by period and column
  const grouped = new Map<TimePeriod, Map<number | null, Appointment[]>>();
  for (const period of PERIOD_ORDER) {
    grouped.set(period, new Map());
  }

  for (const appt of filteredAppointments) {
    const period = classifyTimeSlot(appt.timeSlot);
    const periodMap = grouped.get(period)!;
    const key = groupKey(appt);
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

  // Unassigned appointments (no groupKey value)
  const unassigned = filteredAppointments.filter((a) => groupKey(a) === null);

  // Mobile: group by period
  const mobilePeriods = new Map<TimePeriod, Appointment[]>();
  for (const appt of filteredAppointments) {
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
          <Link href={`/appointments?date=${prevDateStr}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="font-medium text-sm">{displayDate}</span>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/appointments?date=${nextDateStr}`}>
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

      {/* View toggles — segmented control */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Doctor/Room toggle */}
        {columnRooms.length > 0 && (
          <div className="inline-flex rounded-lg border p-0.5 bg-muted/50">
            <Button
              variant={viewMode === "doctor" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 rounded-md"
              onClick={() => setViewMode("doctor")}
            >
              By Doctor
            </Button>
            <Button
              variant={viewMode === "room" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 rounded-md"
              onClick={() => setViewMode("room")}
            >
              By Room
            </Button>
          </div>
        )}

        {/* My Schedule / Clinic Schedule toggle (for doctors) */}
        {isDoctor && (
          <div className="inline-flex rounded-lg border p-0.5 bg-muted/50">
            <Button
              variant={showAll ? "ghost" : "default"}
              size="sm"
              className="text-xs h-7 rounded-md"
              onClick={() => setShowAll(false)}
            >
              My Schedule
            </Button>
            <Button
              variant={showAll ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 rounded-md"
              onClick={() => setShowAll(true)}
            >
              Clinic Schedule
            </Button>
          </div>
        )}
      </div>

      {/* Summary bar */}
      {filteredAppointments.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{filteredAppointments.length} total</Badge>
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

      {filteredAppointments.length === 0 && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          {isDoctor && !showAll
            ? "No appointments assigned to you today."
            : "No appointments for this date."}{" "}
          <Link href={`/appointments/new?date=${dateStr}`} className="text-primary hover:underline">
            Schedule one
          </Link>
        </div>
      )}

      {/* === Desktop Timetable === */}
      {filteredAppointments.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <div
            className="min-w-fit"
            style={{
              display: "grid",
              gridTemplateColumns: `100px repeat(${columns.length}, minmax(180px, 1fr))`,
            }}
          >
            {/* Header row */}
            <div className="border-b px-2 py-2 text-xs font-medium text-muted-foreground sticky left-0 bg-background z-10">
              Time
            </div>
            {columns.map((col) => (
              <div
                key={col.id}
                className={`border-b border-l px-2 py-2 text-xs font-medium text-center truncate ${
                  viewMode === "doctor" && isDoctor && col.id === currentUserId
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted/50"
                }`}
              >
                {columnLabel(col)}
              </div>
            ))}

            {/* Period rows */}
            {activePeriods.map((period) => {
              const periodMap = grouped.get(period)!;
              return (
                <div key={period} className="contents">
                  {/* Period label */}
                  <div className="border-b px-2 py-3 text-xs font-semibold text-primary/70 uppercase tracking-wider sticky left-0 bg-background z-10 flex items-start">
                    {period}
                  </div>
                  {/* Column cells */}
                  {columns.map((col) => {
                    const cellAppts = periodMap.get(col.id) || [];
                    return (
                      <div
                        key={col.id}
                        className={`border-b border-l p-1.5 min-h-[60px] space-y-1.5 ${
                          viewMode === "doctor" && isDoctor && col.id === currentUserId
                            ? "bg-primary/5"
                            : ""
                        }`}
                      >
                        {cellAppts.map((appt) => (
                          <AppointmentCard
                            key={appt.id}
                            appt={appt}
                            compact
                            showDoctorName={viewMode === "room"}
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
                    showDoctorName={viewMode === "room"}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === Mobile Card List === */}
      {filteredAppointments.length > 0 && (
        <div className="md:hidden space-y-4">
          {PERIOD_ORDER.map((period) => {
            const periodAppts = mobilePeriods.get(period);
            if (!periodAppts || periodAppts.length === 0) return null;
            return (
              <div key={period}>
                <h3 className="text-sm font-semibold text-primary/70 uppercase tracking-wider mb-2">
                  {period}
                </h3>
                <div className="space-y-2">
                  {periodAppts.map((appt) => (
                    <div
                      key={appt.id}
                      className="rounded-lg border p-3 text-sm space-y-1 cursor-pointer hover:border-primary/50"
                      onClick={() => router.push(`/patients/${appt.patientId}`)}
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
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <StatusBadge status={appt.status} />
                          <SecondaryActions appt={appt} onStatusChange={handleStatusChange} />
                        </div>
                      </div>
                      <div>
                        <span className="font-mono text-muted-foreground mr-1">
                          #{appt.patientCode}
                        </span>
                        <span className="font-medium">{appt.patientName}</span>
                      </div>
                      {appt.reason && (
                        <div className="text-muted-foreground">{appt.reason}</div>
                      )}
                      <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <PrimaryAction appt={appt} onStatusChange={handleStatusChange} />
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

      {/* Loading indicator — thin top bar instead of full-screen overlay */}
      {isPending && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary animate-pulse" />
      )}
    </div>
  );
}
