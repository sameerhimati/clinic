"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
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

  // Find next up: first ARRIVED, then first SCHEDULED, then first IN_PROGRESS
  const sorted = [...appointments].sort(
    (a, b) => timeSlotSortKey(a.timeSlot) - timeSlotSortKey(b.timeSlot)
  );
  const nextUp =
    sorted.find((a) => a.status === "ARRIVED") ||
    sorted.find((a) => a.status === "SCHEDULED") ||
    sorted.find((a) => a.status === "IN_PROGRESS");

  // Group by period
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
                const isNext = nextUp?.id === appt.id;
                return (
                  <div
                    key={appt.id}
                    className={`group rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                      isCompleted || isCancelled ? "opacity-50" : ""
                    } ${isNext ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
                    onClick={() => router.push(`/patients/${appt.patientId}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {appt.timeSlot || "—"}
                          </span>
                          <StatusBadge status={appt.status} />
                          {isNext && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">NEXT</Badge>
                          )}
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
  );
}
