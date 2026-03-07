"use client";

import { useState, useTransition, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatientSearch } from "@/components/patient-search";
import { createAppointment, updateAppointment, checkConflicts } from "@/app/(main)/appointments/actions";
import Link from "next/link";
import { X, AlertTriangle } from "lucide-react";
import { toTitleCase } from "@/lib/format";
import { toast } from "sonner";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { todayString } from "@/lib/validations";

const ALL_TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Doctor = { id: number; name: string };
type RoomOption = { id: number; name: string };
type DefaultPatient = { id: number; code: number | null; name: string; salutation: string | null };
type AvailabilitySlot = { doctorId: number; dayOfWeek: number; startTime: string; endTime: string };

/** Convert "10:00" to minutes from midnight (600) */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Convert "10:00 AM" to 24h minutes */
function slotToMinutes(slot: string): number {
  const match = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

/** Format availability slots into human-readable text */
function formatAvailability(slots: AvailabilitySlot[]): string {
  if (slots.length === 0) return "";
  return slots
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((s) => {
      const start = formatTime24to12(s.startTime);
      const end = formatTime24to12(s.endTime);
      return `${DAY_NAMES[s.dayOfWeek]} ${start}–${end}`;
    })
    .join(", ");
}

function formatTime24to12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${displayH}${period}` : `${displayH}:${m.toString().padStart(2, "0")}${period}`;
}

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
  doctorAvailability,
  doctorDefaultRooms,
  planItemId,
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
  doctorAvailability?: AvailabilitySlot[];
  doctorDefaultRooms?: Record<number, number>;
  planItemId?: number;
}) {
  const isDoctor = (permissionLevel ?? 0) >= 3;
  const isReschedule = mode === "reschedule";
  const [selectedPatient, setSelectedPatient] = useState<DefaultPatient | null>(
    defaultPatient || null
  );
  const [isPending, startTransition] = useTransition();
  const isDefaultCustomTime = defaultTimeSlot ? !ALL_TIME_SLOTS.includes(defaultTimeSlot) : false;
  const [timeSlotMode, setTimeSlotMode] = useState<"preset" | "custom">(isDefaultCustomTime ? "custom" : "preset");
  const [customTimeSlot, setCustomTimeSlot] = useState(isDefaultCustomTime ? (defaultTimeSlot || "") : "");
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(defaultDoctorId);
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(defaultRoomId || (defaultDoctorId && doctorDefaultRooms?.[defaultDoctorId]) || undefined);
  const [selectedDate, setSelectedDate] = useState(defaultDate || todayString());
  const [conflicts, setConflicts] = useState<{ id: number; patientName: string; timeSlot: string | null; status: string }[]>([]);
  const conflictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConflicts = useCallback(
    (docId: number | undefined, date: string) => {
      if (conflictTimer.current) clearTimeout(conflictTimer.current);
      if (!docId || !date) { setConflicts([]); return; }
      conflictTimer.current = setTimeout(async () => {
        try {
          const results = await checkConflicts(docId, date, "", appointmentId);
          setConflicts(results);
        } catch { setConflicts([]); }
      }, 300);
    },
    [appointmentId]
  );

  useEffect(() => {
    fetchConflicts(selectedDoctorId, selectedDate);
  }, [selectedDoctorId, selectedDate, fetchConflicts]);

  // Get availability for the selected doctor
  const selectedDoctorSlots = useMemo(() => {
    if (!doctorAvailability || !selectedDoctorId) return [];
    return doctorAvailability.filter((a) => a.doctorId === selectedDoctorId);
  }, [doctorAvailability, selectedDoctorId]);

  // Check if selected date falls on an available day
  const selectedDayOfWeek = useMemo(() => {
    if (!selectedDate) return -1;
    return new Date(selectedDate + "T12:00:00").getDay();
  }, [selectedDate]);

  const availabilityForDay = useMemo(() => {
    return selectedDoctorSlots.find((s) => s.dayOfWeek === selectedDayOfWeek);
  }, [selectedDoctorSlots, selectedDayOfWeek]);

  const hasAvailabilityData = selectedDoctorSlots.length > 0;
  const isUnavailableDay = hasAvailabilityData && !availabilityForDay;

  // Filter time slots to doctor's hours for the selected day
  const filteredTimeSlots = useMemo(() => {
    if (!availabilityForDay) return ALL_TIME_SLOTS;
    const startMin = timeToMinutes(availabilityForDay.startTime);
    const endMin = timeToMinutes(availabilityForDay.endTime);
    return ALL_TIME_SLOTS.filter((slot) => {
      const slotMin = slotToMinutes(slot);
      return slotMin >= startMin && slotMin < endMin;
    });
  }, [availabilityForDay]);

  // Nearest 30-min time slot from now
  function getNearestTimeSlot(): string {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 0 : 30;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:${roundedMinutes.toString().padStart(2, "0")} ${period}`;
  }

  function handleWalkInToggle(checked: boolean) {
    setIsWalkIn(checked);
    if (checked) {
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
      {planItemId && <input type="hidden" name="planItemId" value={planItemId} />}

      {/* Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Patient */}
          <div className="space-y-2">
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

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Doctor */}
            {isDoctor ? (
              <div className="space-y-2">
                <Label>Doctor</Label>
                <input type="hidden" name="doctorId" value={defaultDoctorId || ""} />
                <Badge variant="secondary" className="text-sm py-1 px-3">
                  Dr. {toTitleCase(currentDoctorName || "")}
                </Badge>
                {hasAvailabilityData && (
                  <p className="text-xs text-muted-foreground">
                    Available: {formatAvailability(selectedDoctorSlots)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="doctorId">Doctor</Label>
                <select
                  name="doctorId"
                  value={selectedDoctorId || ""}
                  onChange={(e) => {
                    const docId = e.target.value ? parseInt(e.target.value) : undefined;
                    setSelectedDoctorId(docId);
                    if (docId && doctorDefaultRooms?.[docId]) {
                      setSelectedRoomId(doctorDefaultRooms[docId]);
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">Unassigned</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {toTitleCase(d.name)}
                    </option>
                  ))}
                </select>
                {hasAvailabilityData && (
                  <p className="text-xs text-muted-foreground">
                    Available: {formatAvailability(selectedDoctorSlots)}
                  </p>
                )}
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                name="date"
                type="date"
                required
                min={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              {isUnavailableDay && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Doctor not scheduled on {DAY_NAMES[selectedDayOfWeek]}s
                </div>
              )}
            </div>

            {/* Time */}
            <div className="space-y-2">
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
                  {filteredTimeSlots.map((slot) => (
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
                  {!isWalkIn && (
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
                  )}
                </div>
              )}
              {availabilityForDay && (
                <p className="text-xs text-muted-foreground">
                  Hours: {formatTime24to12(availabilityForDay.startTime)}–{formatTime24to12(availabilityForDay.endTime)}
                </p>
              )}
            </div>

            {/* Room */}
            {!isDoctor && rooms && rooms.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="roomId">Room</Label>
                <select
                  name="roomId"
                  value={selectedRoomId || ""}
                  onChange={(e) => setSelectedRoomId(e.target.value ? parseInt(e.target.value) : undefined)}
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
          </div>

          {/* Conflict warning */}
          {conflicts.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900">
                    Doctor has {conflicts.length} appointment{conflicts.length !== 1 ? "s" : ""} on this date
                  </p>
                  <div className="space-y-0.5">
                    {conflicts.map((c) => (
                      <p key={c.id} className="text-xs text-amber-800">
                        {c.timeSlot || "No time"} — {toTitleCase(c.patientName)}
                        <span className="ml-1 text-amber-600">({c.status.toLowerCase().replace("_", " ")})</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                name="reason"
                placeholder="e.g. RCT follow-up, Scaling"
                defaultValue={defaultReason || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea name="notes" rows={2} placeholder="Additional notes..." defaultValue={defaultNotes || ""} />
          </div>

          {/* Walk-in toggle — only for new appointments */}
          {!isReschedule && (
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
          )}
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
