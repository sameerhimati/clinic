"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-4">
      {/* Next Up */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Next Up
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/appointments">View All &rarr;</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {nextUp ? (
            <div className="rounded-lg border-l-4 border-l-primary bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/patients/${nextUp.patientId}`}
                    className="font-medium hover:underline text-base"
                  >
                    <span className="font-mono text-sm text-muted-foreground mr-1">
                      #{nextUp.patientCode}
                    </span>
                    {nextUp.patientName}
                  </Link>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {nextUp.timeSlot && <span>{nextUp.timeSlot} &middot; </span>}
                    {nextUp.reason || "Appointment"}
                  </div>
                </div>
                <StatusBadge status={nextUp.status} />
              </div>
              <div>
                {nextUp.status === "SCHEDULED" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(nextUp.id, "ARRIVED")}
                    disabled={isPending}
                  >
                    Mark Arrived
                  </Button>
                )}
                {nextUp.status === "ARRIVED" && (
                  <Button size="sm" asChild>
                    <Link
                      href={`/visits/new?patientId=${nextUp.patientId}&appointmentId=${nextUp.id}`}
                    >
                      Start Visit
                    </Link>
                  </Button>
                )}
                {nextUp.status === "IN_PROGRESS" && nextUp.visitId && (
                  <Button size="sm" asChild>
                    <Link href={`/visits/${nextUp.visitId}/examine`}>
                      Examine
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <span>All done for today</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mini Schedule */}
      {appointments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Schedule</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                      return (
                        <div
                          key={appt.id}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-accent transition-colors ${
                            isCompleted ? "opacity-50" : ""
                          }`}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
