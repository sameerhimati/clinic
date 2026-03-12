"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DoctorCombobox } from "@/components/doctor-combobox";
import { createAppointmentDirect } from "@/app/(main)/appointments/actions";
import { todayString } from "@/lib/validations";
import { toast } from "sonner";
import { CheckCircle2, CalendarDays, IndianRupee } from "lucide-react";

export type ScheduleDefaults = {
  reason?: string;
  doctorId?: number;
  date?: string;
  planItemId?: number;
};

export function ScheduleFollowUpDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientCode,
  doctors,
  defaults,
  onSuccess,
  onCollectAdvance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName: string;
  patientCode: number | null;
  doctors: { id: number; name: string }[];
  defaults?: ScheduleDefaults;
  onSuccess?: () => void;
  onCollectAdvance?: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState(defaults?.reason || "");
  const [doctorId, setDoctorId] = useState<number | undefined>(defaults?.doctorId);
  const [date, setDate] = useState(defaults?.date || "");
  const [timePreference, setTimePreference] = useState<string>("Morning");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  function resetForm() {
    setReason(defaults?.reason || "");
    setDoctorId(defaults?.doctorId);
    setDate(defaults?.date || "");
    setTimePreference("Morning");
    setSuccess(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  // Sync defaults when they change (e.g. different chain card clicked)
  // This is handled by key prop on parent or explicit reset

  function handleSubmit() {
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    startTransition(async () => {
      try {
        await createAppointmentDirect({
          patientId,
          doctorId,
          date,
          timeSlot: timePreference,
          reason: reason || undefined,
          planItemId: defaults?.planItemId,
        });
        toast.success("Follow-up scheduled");
        setSuccess(true);
        router.refresh();
        onSuccess?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to schedule");
      }
    });
  }

  const today = todayString();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 text-center shrink-0">
              <div className="text-sm font-bold font-mono">#{patientCode}</div>
            </div>
            <div>
              <DialogTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Schedule Follow-Up
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{patientName}</p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Schedule a follow-up appointment for {patientName}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <span className="text-sm text-green-800 font-medium">
              Appointment scheduled for {date}
            </span>
            <div className="flex gap-2">
              {onCollectAdvance && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleOpenChange(false);
                    onCollectAdvance();
                  }}
                >
                  <IndianRupee className="mr-1 h-3.5 w-3.5" />
                  Collect Advance
                </Button>
              )}
              <Button size="sm" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. RCT Step 2"
              />
            </div>

            <div className="space-y-2">
              <Label>Doctor</Label>
              <DoctorCombobox
                doctors={doctors}
                value={doctorId}
                onChange={setDoctorId}
                placeholder="Select doctor..."
                allowEmpty
                emptyLabel="Any Available"
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time Preference</Label>
                <Select value={timePreference} onValueChange={setTimePreference}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Afternoon">Afternoon</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isPending || !date}
              className="w-full"
            >
              {isPending ? "Scheduling..." : "Schedule"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
