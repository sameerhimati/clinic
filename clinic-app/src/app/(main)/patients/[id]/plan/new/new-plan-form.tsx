"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreatmentPlanEditor, type PlanItemDraft } from "@/components/treatment-plan-editor";
import { createTreatmentPlan, updateTreatmentPlan, getOperationSteps } from "../actions";
import { toast } from "sonner";

type OperationOption = { id: number; name: string; category: string | null };
type DoctorOption = { id: number; name: string };

type ExistingPlan = {
  id: number;
  title: string;
  items: Array<{
    id: number;
    label: string;
    operationId: number | null;
    assignedDoctorId: number | null;
    estimatedDayGap: number;
    notes: string | null;
    visitId: number | null;
  }>;
};

export function NewPlanForm({
  patientId,
  operations,
  doctors,
  currentDoctorId,
  existingPlan,
}: {
  patientId: number;
  operations: OperationOption[];
  doctors: DoctorOption[];
  currentDoctorId: number;
  existingPlan?: ExistingPlan;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!existingPlan;

  const [title, setTitle] = useState(existingPlan?.title ?? "");
  const [items, setItems] = useState<PlanItemDraft[]>(() => {
    if (!existingPlan) return [];
    return existingPlan.items.map((item) => ({
      id: crypto.randomUUID(),
      label: item.label,
      operationId: item.operationId,
      assignedDoctorId: item.assignedDoctorId,
      estimatedDayGap: item.estimatedDayGap,
      notes: item.notes,
      isCompleted: item.visitId !== null,
    }));
  });

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
        if (isEditMode) {
          const uncompletedItems = items
            .filter((i) => !i.isCompleted)
            .map((i) => ({
              label: i.label,
              operationId: i.operationId,
              assignedDoctorId: i.assignedDoctorId,
              estimatedDayGap: i.estimatedDayGap,
              notes: i.notes,
            }));
          await updateTreatmentPlan(existingPlan!.id, {
            title,
            items: uncompletedItems,
          });
          toast.success("Treatment plan updated");
        } else {
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
        }
        router.push(`/patients/${patientId}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : isEditMode ? "Failed to update plan" : "Failed to create plan");
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
          {isPending
            ? (isEditMode ? "Updating..." : "Creating...")
            : (isEditMode ? "Update Plan" : "Create Plan")}
        </Button>
      </div>
    </div>
  );
}
