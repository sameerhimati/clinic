"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatientSearch } from "@/components/patient-search";
import { createAppointment, updateAppointment } from "@/app/(main)/appointments/actions";
import Link from "next/link";
import { X } from "lucide-react";
import { toast } from "sonner";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { todayString } from "@/lib/validations";

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM",
];

type Doctor = { id: number; name: string };
type RoomOption = { id: number; name: string };
type DefaultPatient = { id: number; code: number | null; name: string; salutation: string | null };

export function AppointmentForm({
  doctors,
  rooms,
  defaultPatient,
  defaultDoctorId,
  defaultRoomId,
  defaultDate,
  defaultTimeSlot,
  defaultReason,
  defaultNotes,
  permissionLevel,
  currentDoctorName,
  appointmentId,
  mode = "create",
}: {
  doctors: Doctor[];
  rooms?: RoomOption[];
  defaultPatient?: DefaultPatient | null;
  defaultDoctorId?: number;
  defaultRoomId?: number;
  defaultDate?: string;
  defaultTimeSlot?: string;
  defaultReason?: string;
  defaultNotes?: string;
  permissionLevel?: number;
  currentDoctorName?: string;
  appointmentId?: number;
  mode?: "create" | "reschedule";
}) {
  const isDoctor = permissionLevel === 3;
  const isReschedule = mode === "reschedule";
  const [selectedPatient, setSelectedPatient] = useState<DefaultPatient | null>(
    defaultPatient || null
  );
  const [isPending, startTransition] = useTransition();
  const isDefaultCustomTime = defaultTimeSlot ? !TIME_SLOTS.includes(defaultTimeSlot) : false;
  const [timeSlotMode, setTimeSlotMode] = useState<"preset" | "custom">(isDefaultCustomTime ? "custom" : "preset");
  const [customTimeSlot, setCustomTimeSlot] = useState(isDefaultCustomTime ? (defaultTimeSlot || "") : "");
  const [isWalkIn, setIsWalkIn] = useState(false);

  // Nearest 30-min time slot from now (e.g. 10:00 AM, 10:30 AM)
  function getNearestTimeSlot(): string {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    minutes = minutes < 30 ? 0 : 30;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  function handleWalkInToggle(checked: boolean) {
    setIsWalkIn(checked);
    if (checked) {
      // Auto-fill time to nearest 30-min slot
      const slot = getNearestTimeSlot();
      setTimeSlotMode("custom");
      setCustomTimeSlot(slot);
    } else {
      setTimeSlotMode("preset");
      setCustomTimeSlot("");
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (isReschedule && appointmentId) {
          await updateAppointment(appointmentId, formData);
          toast.success("Appointment rescheduled");
        } else {
          await createAppointment(formData);
        }
      } catch (e) {
        if (isRedirectError(e)) throw e;
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const todayStr = todayString();

  return (
    <form action={handleSubmit} className="space-y-6">
      {selectedPatient && (
        <input type="hidden" name="patientId" value={selectedPatient.id} />
      )}
      {isWalkIn && <input type="hidden" name="isWalkIn" value="true" />}

      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {/* Patient selection */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>
              Patient <span className="text-destructive">*</span>
            </Label>
            {selectedPatient ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm py-1 px-3">
                  <span className="font-mono mr-1">#{selectedPatient.code}</span>
                  {selectedPatient.salutation && `${selectedPatient.salutation}. `}
                  {selectedPatient.name}
                </Badge>
                {!isDoctor && !isReschedule && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Change
                  </Button>
                )}
              </div>
            ) : (
              <PatientSearch onSelect={setSelectedPatient} />
            )}
          </div>

          {isDoctor ? (
            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <input type="hidden" name="doctorId" value={defaultDoctorId || ""} />
              <Badge variant="secondary" className="text-sm py-1 px-3">
                Dr. {currentDoctorName}
              </Badge>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="doctorId">Doctor</Label>
              <select
                name="doctorId"
                defaultValue={defaultDoctorId || ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Unassigned</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isDoctor && rooms && rooms.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="roomId">Room</Label>
              <select
                name="roomId"
                defaultValue={defaultRoomId || ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">No room assigned</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              name="date"
              type="date"
              required
              min={todayStr}
              defaultValue={defaultDate || todayStr}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timeSlot">Time</Label>
            {timeSlotMode === "preset" ? (
              <select
                name="timeSlot"
                defaultValue={defaultTimeSlot || ""}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setTimeSlotMode("custom");
                    e.target.value = "";
                  }
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select time...</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
                <option value="__other__">Other...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <Input
                  name="timeSlot"
                  placeholder="e.g. 1:15 PM"
                  value={customTimeSlot}
                  onChange={(e) => setCustomTimeSlot(e.target.value)}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTimeSlotMode("preset");
                    setCustomTimeSlot("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Input
              name="reason"
              placeholder="e.g. RCT follow-up, Scaling"
              defaultValue={defaultReason || ""}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea name="notes" rows={2} placeholder="Additional notes..." defaultValue={defaultNotes || ""} />
          </div>

          {/* Walk-in toggle — only for new appointments */}
          {!isReschedule && <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer rounded-lg border p-3 hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={isWalkIn}
                onChange={(e) => handleWalkInToggle(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <div>
                <div className="text-sm font-medium">Walk-in patient</div>
                <div className="text-xs text-muted-foreground">
                  Auto-fills current time and marks patient as arrived
                </div>
              </div>
            </label>
          </div>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" asChild>
          <Link href={defaultPatient ? `/patients/${defaultPatient.id}` : "/appointments"}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={!selectedPatient || isPending}>
          {isPending ? "Saving..." : isReschedule ? "Reschedule" : isWalkIn ? "Register Walk-in" : "Schedule Appointment"}
        </Button>
      </div>
    </form>
  );
}
