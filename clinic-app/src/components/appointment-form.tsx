"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatientSearch } from "@/components/patient-search";
import { createAppointment } from "@/app/(main)/appointments/actions";
import { X } from "lucide-react";
import { toast } from "sonner";

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
  const [selectedPatient, setSelectedPatient] = useState<DefaultPatient | null>(
    defaultPatient || null
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createAppointment(formData);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <form action={handleSubmit} className="space-y-6">
      {selectedPatient && (
        <input type="hidden" name="patientId" value={selectedPatient.id} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Patient selection */}
          <div className="space-y-2 sm:col-span-2">
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
            <div className="space-y-2">
              <Label>Doctor</Label>
              <input type="hidden" name="doctorId" value={defaultDoctorId || ""} />
              <Badge variant="secondary" className="text-sm py-1 px-3">
                Dr. {currentDoctorName}
              </Badge>
            </div>
          ) : (
            <div className="space-y-2">
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
            <div className="space-y-2">
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

          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label htmlFor="timeSlot">Time</Label>
            <Input
              name="timeSlot"
              placeholder="e.g. 10:00 AM, 2:30 PM"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              name="reason"
              placeholder="e.g. RCT follow-up, Scaling"
              defaultValue={defaultReason || ""}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea name="notes" rows={2} placeholder="Additional notes..." />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={!selectedPatient || isPending}>
        {isPending ? "Scheduling..." : "Schedule Appointment"}
      </Button>
    </form>
  );
}
