"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { saveAvailability } from "@/app/(main)/doctors/actions";
import { Clock } from "lucide-react";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

type Slot = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export function AvailabilityEditor({
  doctorId,
  existing,
}: {
  doctorId: number;
  existing: { dayOfWeek: number; startTime: string; endTime: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  const existingMap = new Map(existing.map((e) => [e.dayOfWeek, e]));

  const [slots, setSlots] = useState<Slot[]>(
    DAYS.map((d) => {
      const ex = existingMap.get(d.value);
      return {
        dayOfWeek: d.value,
        enabled: !!ex,
        startTime: ex?.startTime || "09:00",
        endTime: ex?.endTime || "17:00",
      };
    })
  );

  function updateSlot(dayOfWeek: number, update: Partial<Slot>) {
    setSlots((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, ...update } : s))
    );
  }

  function handleSave() {
    const enabledSlots = slots
      .filter((s) => s.enabled)
      .map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }));

    startTransition(async () => {
      try {
        await saveAvailability(doctorId, enabledSlots);
        toast.success("Availability saved");
      } catch {
        toast.error("Failed to save availability");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Weekly Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {DAYS.map((day) => {
          const slot = slots.find((s) => s.dayOfWeek === day.value)!;
          return (
            <div key={day.value} className="flex items-center gap-3">
              <label className="flex items-center gap-2 w-28 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  onChange={(e) => updateSlot(day.value, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm font-medium">{day.label}</span>
              </label>
              {slot.enabled ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(day.value, { startTime: e.target.value })}
                    className="w-32 h-8 text-sm"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(day.value, { endTime: e.target.value })}
                    className="w-32 h-8 text-sm"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Not available</span>
              )}
            </div>
          );
        })}
        <div className="pt-2">
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save Availability"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
