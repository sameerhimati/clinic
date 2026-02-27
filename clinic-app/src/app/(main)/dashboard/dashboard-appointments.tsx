"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
import { StatusBadge } from "@/components/status-badge";

type DashboardAppointment = {
  id: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  doctorName: string | null;
  visitId: number | null;
  timeSlot: string | null;
  status: string;
  reason: string | null;
};

const STATUS_BORDER_COLOR: Record<string, string> = {
  SCHEDULED: "border-l-blue-400",
  ARRIVED: "border-l-amber-400",
  IN_PROGRESS: "border-l-blue-600",
  COMPLETED: "border-l-green-400",
  CANCELLED: "border-l-gray-300",
  NO_SHOW: "border-l-red-400",
};

export function DashboardAppointmentList({
  appointments,
}: {
  appointments: DashboardAppointment[];
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

  const apptCounts: Record<string, number> = {};
  for (const a of appointments) {
    apptCounts[a.status] = (apptCounts[a.status] || 0) + 1;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Today&apos;s Appointments
          <Badge variant="secondary" className="text-xs">{appointments.length}</Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/appointments">View All &rarr;</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {appointments.length > 0 ? (
          <>
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
                  className={`flex items-center justify-between py-2.5 border-l-4 pl-3 -ml-2 cursor-pointer hover:bg-accent/50 transition-colors ${STATUS_BORDER_COLOR[appt.status] || ""}`}
                  onClick={() => router.push(`/patients/${appt.patientId}`)}
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">#{appt.patientCode}</span>
                      {appt.patientName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appt.timeSlot && <span>{appt.timeSlot} · </span>}
                      {appt.doctorName && <span>Dr. {appt.doctorName} · </span>}
                      {appt.reason || "Appointment"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                        <Link href={`/visits/${appt.visitId}`}>
                          View
                        </Link>
                      </Button>
                    )}
                    <StatusBadge status={appt.status} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            No appointments scheduled today.{" "}
            <Link href="/appointments/new" className="text-primary hover:underline">Schedule one</Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
