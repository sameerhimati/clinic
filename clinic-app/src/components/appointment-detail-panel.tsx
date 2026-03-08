"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { toTitleCase } from "@/lib/format";
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
  planItemId: number | null;
  roomId: number | null;
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

type RoomOption = { id: number; name: string };

export function AppointmentDetailPanel({
  appointment,
  open,
  onOpenChange,
  onStatusChange,
  onExamine,
  isDoctor,
  canCollect,
  rooms,
  onRoomChange,
}: {
  appointment: PanelAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: number, status: string) => void;
  onExamine?: (patientId: number, appointmentId: number, planItemId?: number | null) => void;
  isDoctor?: boolean;
  canCollect?: boolean;
  rooms?: RoomOption[];
  onRoomChange?: (appointmentId: number, roomId: number | null) => void;
}) {
  if (!appointment) return null;
  const appt = appointment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left">
            <div className="text-xs font-mono text-muted-foreground">#{appt.patientCode}</div>
            <div className="text-lg font-semibold flex items-center gap-2 flex-wrap">
              <span>{appt.patientSalutation && `${appt.patientSalutation}. `}{toTitleCase(appt.patientName)}</span>
              {appt.diseases.map((d) => {
                const abbr = d === "Diabetes" ? "DM" : d === "High Blood Pressure" ? "BP" : d === "Allergies" ? "Allergy" : d;
                return (
                  <Badge key={d} variant="outline" className="border-amber-200 bg-amber-100 text-amber-800 text-xs font-medium">
                    {abbr}
                  </Badge>
                );
              })}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">Appointment details and actions</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Status row */}
          <div className="flex items-center gap-2 mb-4">
            <StatusBadge status={appt.status} />
            {appt.planItemId ? (
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                Treatment Step
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Consultation
              </Badge>
            )}
            {appt.visitCount > 1 && (
              <span className="text-muted-foreground text-xs">{appt.visitCount} total visits</span>
            )}
          </div>

          {/* Appointment metadata grid */}
          <div className="rounded-lg border p-4 grid grid-cols-2 gap-3">
            {appt.timeSlot && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</div>
                <div className="text-sm font-medium mt-0.5">{appt.timeSlot}</div>
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Room</div>
              {!isDoctor && onRoomChange && rooms && rooms.length > 0 && !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appt.status) ? (
                <select
                  value={appt.roomId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    onRoomChange(appt.id, val ? parseInt(val) : null);
                  }}
                  className="mt-0.5 flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="">No room</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm font-medium mt-0.5">{appt.roomName || "—"}</div>
              )}
            </div>
            {appt.doctorName && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Doctor</div>
                <div className="text-sm font-medium mt-0.5">Dr. {toTitleCase(appt.doctorName)}</div>
              </div>
            )}
            {!appt.operationName && appt.reason && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</div>
                <div className="text-sm font-medium mt-0.5">{appt.reason}</div>
              </div>
            )}
          </div>

          {/* Treatment section */}
          {appt.operationName && (
            <div className="rounded-lg border p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Treatment</div>
              <div className="font-medium mt-0.5">{appt.operationName}</div>
              {appt.stepLabel && (
                <div className="text-primary text-sm mt-0.5">{appt.stepLabel}</div>
              )}
            </div>
          )}

          {/* Previous notes (if follow-up) */}
          {appt.previousDiagnosis && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Previous Diagnosis</div>
              <div className="text-sm whitespace-pre-wrap">{appt.previousDiagnosis}</div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t">
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
                  onExamine(appt.patientId, appt.id, appt.planItemId);
                  onOpenChange(false);
                }}
              >
                Examine Patient
              </Button>
            )}

            {appt.status === "ARRIVED" && !isDoctor && (
              <div className="w-full rounded-md border border-amber-200 bg-amber-50 py-2 text-center text-sm text-amber-700">
                Patient is waiting for doctor
              </div>
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
      </DialogContent>
    </Dialog>
  );
}
