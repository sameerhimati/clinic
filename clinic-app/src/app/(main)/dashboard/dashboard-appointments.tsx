"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
import { StatusBadge } from "@/components/status-badge";
import { toTitleCase } from "@/lib/format";

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
  medicalAlerts?: string[];
  totalCollected?: number | null;
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
                  className={`flex items-center justify-between py-3 border-l-4 pl-4 -ml-6 cursor-pointer hover:bg-accent/50 transition-colors ${STATUS_BORDER_COLOR[appt.status] || ""}`}
                  onClick={() => router.push(`/patients/${appt.patientId}`)}
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">#{appt.patientCode}</span>
                      {appt.patientName}
                    </div>
                    {appt.medicalAlerts && appt.medicalAlerts.length > 0 && (
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
                      {appt.totalCollected != null && appt.totalCollected < 0 && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0 ml-1">
                          Due: {"\u20B9"}{Math.abs(appt.totalCollected).toLocaleString("en-IN")}
                        </Badge>
                      )}
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
                      <StatusBadge status={appt.status} />
                    )}
                    {appt.status === "IN_PROGRESS" && appt.visitId && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                        <Link href={`/visits/${appt.visitId}`}>
                          View
                        </Link>
                      </Button>
                    )}
                    {appt.status === "COMPLETED" && (
                      <StatusBadge status={appt.status} />
                    )}
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
