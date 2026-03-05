"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { toTitleCase } from "@/lib/format";
import { saveTreatmentSteps } from "./actions";

type Step = {
  name: string;
  description: string;
  defaultDayGap: number;
  defaultDoctorId: number | null;
};

type DoctorOption = { id: number; name: string; specialty: string | null };

export function TreatmentStepsEditor({
  operationId,
  operationName,
  initialSteps,
  doctors,
}: {
  operationId: number;
  operationName: string;
  initialSteps: Step[];
  doctors?: DoctorOption[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isDirty =
    JSON.stringify(steps) !== JSON.stringify(initialSteps);

  // Group doctors by specialty for optgroup
  const doctorsBySpecialty = new Map<string, DoctorOption[]>();
  if (doctors) {
    for (const d of doctors) {
      const spec = d.specialty || "Other";
      if (!doctorsBySpecialty.has(spec)) doctorsBySpecialty.set(spec, []);
      doctorsBySpecialty.get(spec)!.push(d);
    }
  }

  function addStep() {
    setSteps([...steps, { name: "", description: "", defaultDayGap: 7, defaultDoctorId: null }]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof Step, value: string | number | null) {
    setSteps(
      steps.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      )
    );
  }

  function moveStep(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  }

  function handleSave() {
    // Validate: all steps must have names
    if (steps.some((s) => !s.name.trim())) {
      toast.error("All steps must have a name");
      return;
    }
    startTransition(async () => {
      try {
        await saveTreatmentSteps(operationId, steps);
        toast.success("Treatment steps saved");
        router.refresh();
      } catch {
        toast.error("Failed to save treatment steps");
      }
    });
  }

  return (
    <div className="border-t pt-3 mt-3">
      <button
        type="button"
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground w-full"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        Treatment Steps ({steps.length})
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveStep(i, -1)}
                  disabled={i === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(i, 1)}
                  disabled={i === steps.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <span className="text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
              <Input
                value={step.name}
                onChange={(e) => updateStep(i, "name", e.target.value)}
                placeholder="Step name"
                className="h-7 text-xs flex-1 min-w-0"
              />
              <div className="flex items-center gap-1 shrink-0">
                <Input
                  type="number"
                  value={step.defaultDayGap}
                  onChange={(e) =>
                    updateStep(i, "defaultDayGap", parseInt(e.target.value) || 0)
                  }
                  className="h-7 text-xs w-14 text-center"
                  min={0}
                />
                <span className="text-muted-foreground">days</span>
              </div>
              {doctors && doctors.length > 0 && (
                <select
                  value={step.defaultDoctorId || ""}
                  onChange={(e) =>
                    updateStep(i, "defaultDoctorId", e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="h-7 text-xs rounded-md border border-input bg-background px-1.5 w-28 shrink-0"
                  title="Default doctor for this step"
                >
                  <option value="">Any doctor</option>
                  {Array.from(doctorsBySpecialty.entries()).map(([spec, docs]) => (
                    <optgroup key={spec} label={spec}>
                      {docs.map((d) => (
                        <option key={d.id} value={d.id}>{toTitleCase(d.name)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={addStep}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Step
            </Button>
            {isDirty && (
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Save Steps"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
