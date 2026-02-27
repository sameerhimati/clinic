"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";
import { classifyTimeSlot, timeSlotSortKey, PERIOD_ORDER, type TimePeriod } from "@/lib/time-slots";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
import { createVisitAndExamine } from "@/app/(main)/visits/actions";
import { StatusBadge } from "@/components/status-badge";

type ScheduleAppointment = {
  id: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  visitId: number | null;
  timeSlot: string | null;
  status: string;
  reason: string | null;
};

export function DoctorScheduleWidget({
  appointments,
}: {
  appointments: ScheduleAppointment[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(appointmentId: number, status: string) {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, status);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  function handleExamine(patientId: number, appointmentId: number) {
    startTransition(async () => {
      try {
        const result = await createVisitAndExamine(patientId, appointmentId);
        router.push(`/visits/${result.visitId}/examine`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create visit");
      }
    });
  }

  const sorted = [...appointments].sort(
    (a, b) => timeSlotSortKey(a.timeSlot) - timeSlotSortKey(b.timeSlot)
  );

  // Now Seeing: the IN_PROGRESS appointment (realistically only 1)
  const nowSeeing = sorted.find((a) => a.status === "IN_PROGRESS");

  // Waiting Room: all ARRIVED patients
  const arrivedPatients = sorted.filter((a) => a.status === "ARRIVED");

  // Group by period for the full schedule list
  const periodGroups = new Map<TimePeriod, ScheduleAppointment[]>();
  for (const appt of sorted) {
    const period = classifyTimeSlot(appt.timeSlot);
    if (!periodGroups.has(period)) periodGroups.set(period, []);
    periodGroups.get(period)!.push(appt);
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
        <span>No appointments today</span>
        <Link href="/appointments/new" className="text-primary hover:underline text-sm">
          Schedule one
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Now Seeing — blue hero card */}
      {nowSeeing && (
        <div className="rounded-lg border-2 border-blue-400 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Now Seeing
                </span>
                <StatusBadge status={nowSeeing.status} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  #{nowSeeing.patientCode}
                </span>
                <span className="text-lg font-semibold">
                  {nowSeeing.patientName}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                {nowSeeing.timeSlot && <span>{nowSeeing.timeSlot} · </span>}
                {nowSeeing.reason || "Appointment"}
              </div>
            </div>
            <div className="shrink-0 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              {nowSeeing.visitId && (
                <Button size="default" asChild>
                  <Link href={`/visits/${nowSeeing.visitId}/examine`}>
                    Continue Exam
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/patients/${nowSeeing.patientId}`}>
                  View Patient
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting Room — amber card listing all ARRIVED patients */}
      {arrivedPatients.length > 0 && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Waiting Room
            </span>
            <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">
              {arrivedPatients.length} waiting
            </Badge>
          </div>
          <div className="space-y-2">
            {arrivedPatients.map((appt, index) => (
              <div
                key={appt.id}
                className="flex items-center justify-between gap-3 rounded-md bg-white/60 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{appt.patientCode}
                    </span>
                    <span className="font-medium text-sm">
                      {appt.patientName}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {appt.timeSlot && <span>{appt.timeSlot} · </span>}
                    {appt.reason || "Appointment"}
                  </div>
                </div>
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* First arrived patient gets Examine CTA if no one is IN_PROGRESS */}
                  {!nowSeeing && index === 0 ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleExamine(appt.patientId, appt.id)}
                      disabled={isPending}
                    >
                      {isPending ? "Starting..." : "Examine"}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/patients/${appt.patientId}`}>
                        View Patient
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full schedule list */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Today&apos;s Schedule
            <Badge variant="secondary" className="text-xs">{appointments.length}</Badge>
          </h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/appointments">View full schedule &rarr;</Link>
          </Button>
        </div>

      {PERIOD_ORDER.map((period) => {
        const periodAppts = periodGroups.get(period);
        if (!periodAppts || periodAppts.length === 0) return null;
        return (
          <div key={period}>
            <div className="px-4 py-1.5 text-xs font-semibold text-primary/70 uppercase tracking-wider bg-muted/50">
              {period}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
              {periodAppts.map((appt) => {
                const isCompleted = appt.status === "COMPLETED";
                const isCancelled = appt.status === "CANCELLED" || appt.status === "NO_SHOW";
                return (
                  <div
                    key={appt.id}
                    className={`group rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                      isCompleted || isCancelled ? "opacity-50" : ""
                    }`}
                    onClick={() => router.push(`/patients/${appt.patientId}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {appt.timeSlot || "—"}
                          </span>
                          <StatusBadge status={appt.status} />
                        </div>
                        <div className="truncate">
                          <span className="font-mono text-xs text-muted-foreground mr-1">
                            #{appt.patientCode}
                          </span>
                          <span className={`font-medium text-sm ${isCompleted ? "line-through" : ""}`}>
                            {appt.patientName}
                          </span>
                        </div>
                        {appt.reason && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{appt.reason}</div>
                        )}
                      </div>
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        {appt.status === "SCHEDULED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleStatusChange(appt.id, "ARRIVED")}
                            disabled={isPending}
                          >
                            Arrived
                          </Button>
                        )}
                        {appt.status === "ARRIVED" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs"
                            onClick={() => handleExamine(appt.patientId, appt.id)}
                            disabled={isPending}
                          >
                            {isPending ? "..." : "Examine"}
                          </Button>
                        )}
                        {appt.status === "IN_PROGRESS" && appt.visitId && (
                          <Button size="sm" variant="default" className="h-7 text-xs" asChild>
                            <Link href={`/visits/${appt.visitId}/examine`}>
                              Examine
                            </Link>
                          </Button>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
