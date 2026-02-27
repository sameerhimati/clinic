"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatientSearch } from "@/components/patient-search";
import { createAppointment, createWalkIn } from "@/app/(main)/appointments/actions";
import Link from "next/link";
import { X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { todayString } from "@/lib/validations";

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM",
];

type Doctor = { id: number; name: string };
type RoomOption = { id: number; name: string };
type DefaultPatient = { id: number; code: number | null; name: string; salutation: string | null };

export function AppointmentForm({
  doctors,
  rooms,
  defaultPatient,
  defaultDoctorId,
  defaultDate,
  defaultReason,
  permissionLevel,
  currentDoctorName,
}: {
  doctors: Doctor[];
  rooms?: RoomOption[];
  defaultPatient?: DefaultPatient | null;
  defaultDoctorId?: number;
  defaultDate?: string;
  defaultReason?: string;
  permissionLevel?: number;
  currentDoctorName?: string;
}) {
  const isDoctor = permissionLevel === 3;
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState<DefaultPatient | null>(
    defaultPatient || null
  );
  const [isPending, startTransition] = useTransition();
  const [timeSlotMode, setTimeSlotMode] = useState<"preset" | "custom">("preset");
  const [customTimeSlot, setCustomTimeSlot] = useState("");
  const [isWalkIn, setIsWalkIn] = useState(false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createAppointment(formData);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleWalkIn() {
    if (!selectedPatient) {
      toast.error("Please select a patient first");
      return;
    }
    startTransition(async () => {
      try {
        await createWalkIn(selectedPatient.id);
        toast.success("Walk-in registered — patient marked as arrived");
        router.push(`/patients/${selectedPatient.id}`);
      } catch (e) {
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
                {!isDoctor && (
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
                defaultValue=""
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
                defaultValue=""
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
            <Textarea name="notes" rows={2} placeholder="Additional notes..." />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" asChild>
          <Link href={defaultPatient ? `/patients/${defaultPatient.id}` : "/appointments"}>Cancel</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!selectedPatient || isPending}
          onClick={handleWalkIn}
        >
          <Zap className="mr-1 h-3.5 w-3.5" />
          {isPending ? "..." : "Walk-in"}
        </Button>
        <Button type="submit" disabled={!selectedPatient || isPending}>
          {isPending ? "Scheduling..." : "Schedule Appointment"}
        </Button>
      </div>
    </form>
  );
}
