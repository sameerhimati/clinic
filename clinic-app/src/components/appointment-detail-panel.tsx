"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/status-badge";
import { User, MapPin, Clock, Stethoscope, ExternalLink } from "lucide-react";

type PanelAppointment = {
  id: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  patientSalutation: string | null;
  doctorId: number | null;
  doctorName: string | null;
  visitId: number | null;
  roomName: string | null;
  timeSlot: string | null;
  status: string;
  reason: string | null;
  operationName: string | null;
  stepLabel: string | null;
  diseases: string[];
  visitCount: number;
  previousDiagnosis: string | null;
};

export function AppointmentDetailPanel({
  appointment,
  open,
  onOpenChange,
  onStatusChange,
  onExamine,
  isDoctor,
  canCollect,
}: {
  appointment: PanelAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: number, status: string) => void;
  onExamine?: (patientId: number, appointmentId: number) => void;
  isDoctor?: boolean;
  canCollect?: boolean;
}) {
  if (!appointment) return null;
  const appt = appointment;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">
            <span className="font-mono text-muted-foreground mr-2">#{appt.patientCode}</span>
            {appt.patientSalutation && `${appt.patientSalutation}. `}
            {appt.patientName}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Medical flags */}
          {appt.diseases.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {appt.diseases.map((d) => {
                const abbr = d === "Diabetes" ? "DM" : d === "High Blood Pressure" ? "BP" : d === "Allergies" ? "Allergy" : d;
                return (
                  <span key={d} className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-medium">
                    {abbr}
                  </span>
                );
              })}
            </div>
          )}

          {/* Appointment details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge status={appt.status} />
              {appt.visitCount > 1 && (
                <span className="text-muted-foreground text-xs">{appt.visitCount} total visits</span>
              )}
            </div>

            {appt.timeSlot && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                {appt.timeSlot}
              </div>
            )}

            {appt.roomName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                {appt.roomName}
              </div>
            )}

            {appt.doctorName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Stethoscope className="h-4 w-4 shrink-0" />
                Dr. {appt.doctorName}
              </div>
            )}

            {/* Operation / reason */}
            {(appt.operationName || appt.reason) && (
              <div className="pt-1">
                {appt.operationName && (
                  <div className="font-medium">{appt.operationName}</div>
                )}
                {appt.stepLabel && (
                  <div className="text-primary text-sm">{appt.stepLabel}</div>
                )}
                {!appt.operationName && appt.reason && (
                  <div className="text-muted-foreground">{appt.reason}</div>
                )}
              </div>
            )}
          </div>

          {/* Previous notes (if follow-up) */}
          {appt.previousDiagnosis && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Previous Diagnosis</div>
              <div className="text-sm whitespace-pre-wrap">{appt.previousDiagnosis}</div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t">
            {/* Primary contextual action */}
            {appt.status === "SCHEDULED" && (
              <Button
                className="w-full"
                onClick={() => {
                  onStatusChange(appt.id, "ARRIVED");
                  onOpenChange(false);
                }}
              >
                Mark Arrived
              </Button>
            )}

            {appt.status === "ARRIVED" && isDoctor && onExamine && (
              <Button
                className="w-full"
                onClick={() => {
                  onExamine(appt.patientId, appt.id);
                  onOpenChange(false);
                }}
              >
                Examine Patient
              </Button>
            )}

            {appt.status === "ARRIVED" && !isDoctor && (
              <Button className="w-full" asChild>
                <Link href={`/visits/new?patientId=${appt.patientId}&appointmentId=${appt.id}${appt.doctorId ? `&doctorId=${appt.doctorId}` : ""}`}>
                  Start Visit
                </Link>
              </Button>
            )}

            {appt.status === "IN_PROGRESS" && appt.visitId && (
              <Button className="w-full" asChild>
                <Link href={`/visits/${appt.visitId}/examine`}>
                  Examine
                </Link>
              </Button>
            )}

            {/* View patient link */}
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/patients/${appt.patientId}`}>
                <User className="mr-2 h-4 w-4" />
                View Patient
                <ExternalLink className="ml-auto h-3.5 w-3.5" />
              </Link>
            </Button>

            {/* Cancel / No Show */}
            {(appt.status === "SCHEDULED" || appt.status === "ARRIVED") && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-destructive"
                  onClick={() => {
                    onStatusChange(appt.id, "CANCEL_PROMPT");
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
                {appt.status === "SCHEDULED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      onStatusChange(appt.id, "NO_SHOW");
                      onOpenChange(false);
                    }}
                  >
                    No Show
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
