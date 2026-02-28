"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreatmentPlanEditor, type PlanItemDraft } from "@/components/treatment-plan-editor";
import { createTreatmentPlan, getOperationSteps } from "../actions";
import { toast } from "sonner";

type OperationOption = { id: number; name: string; category: string | null };
type DoctorOption = { id: number; name: string };

export function NewPlanForm({
  patientId,
  operations,
  doctors,
  currentDoctorId,
}: {
  patientId: number;
  operations: OperationOption[];
  doctors: DoctorOption[];
  currentDoctorId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<PlanItemDraft[]>([]);

  async function loadTemplateSteps(operationId: number) {
    const steps = await getOperationSteps(operationId);
    return steps.map((s) => ({
      name: s.name,
      defaultDayGap: s.defaultDayGap,
      description: s.description,
    }));
  }

  function handleSubmit() {
    if (!title.trim()) {
      toast.error("Please enter a plan title");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one step");
      return;
    }
    if (items.some((i) => !i.label.trim())) {
      toast.error("All steps need a name");
      return;
    }

    startTransition(async () => {
      try {
        await createTreatmentPlan(
          patientId,
          title,
          items.map((i) => ({
            label: i.label,
            operationId: i.operationId,
            assignedDoctorId: i.assignedDoctorId,
            estimatedDayGap: i.estimatedDayGap,
            notes: i.notes,
          })),
        );
        toast.success("Treatment plan created");
        router.push(`/patients/${patientId}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create plan");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plan Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="e.g. RCT + Crown tooth 36"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Treatment Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <TreatmentPlanEditor
            items={items}
            onChange={setItems}
            operations={operations}
            doctors={doctors}
            defaultDoctorId={currentDoctorId}
            onLoadTemplateSteps={loadTemplateSteps}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Creating..." : "Create Plan"}
        </Button>
      </div>
    </div>
  );
}
