"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { classifyTimeSlot, timeSlotSortKey, PERIOD_ORDER, type TimePeriod } from "@/lib/time-slots";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
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
            <div className="divide-y">
              {periodAppts.map((appt) => {
                const isCompleted = appt.status === "COMPLETED";
                const isNext = nextUp?.id === appt.id;
                return (
                  <div
                    key={appt.id}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-accent transition-colors ${
                      isCompleted ? "opacity-50" : ""
                    } ${isNext ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
                    onClick={() => router.push(`/patients/${appt.patientId}`)}
                  >
                    <span className="text-muted-foreground text-xs w-16 shrink-0">
                      {appt.timeSlot || "—"}
                    </span>
                    <span className="min-w-0 truncate flex-1">
                      <span className="font-mono text-muted-foreground mr-1">
                        #{appt.patientCode}
                      </span>
                      <span className={`font-medium ${isCompleted ? "line-through" : ""}`}>{appt.patientName}</span>
                      {isNext && (
                        <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">NEXT</Badge>
                      )}
                    </span>
                    <StatusBadge status={appt.status} />
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
                        <Button size="sm" variant="default" className="h-7 text-xs" asChild>
                          <Link href={`/visits/new?patientId=${appt.patientId}&appointmentId=${appt.id}`}>
                            Start Visit
                          </Link>
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
