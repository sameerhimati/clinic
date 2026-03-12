"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TreatmentPlanEditor, type PlanItemDraft } from "@/components/treatment-plan-editor";
import { createTreatmentPlan, updateTreatmentPlan, getOperationSteps } from "../actions";
import { toast } from "sonner";
import { User, Link2 } from "lucide-react";

type OperationOption = { id: number; name: string; category: string | null };
type DoctorOption = { id: number; name: string };
type ChainOption = { id: number; title: string; toothNumbers: string | null };

type ExistingPlan = {
  id: number;
  title: string;
  items: Array<{
    id: number;
    label: string;
    operationId: number | null;
    assignedDoctorId: number | null;
    estimatedDayGap: number;
    scheduledDate: string | null; // ISO date string or null
    notes: string | null;
    visitId: number | null;
  }>;
};

// Standard dental notation: upper right (18-11), upper left (21-28), lower left (38-31), lower right (41-48)
const TOOTH_ROWS = [
  { label: "Upper Right", teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
  { label: "Upper Left", teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
  { label: "Lower Left", teeth: [38, 37, 36, 35, 34, 33, 32, 31] },
  { label: "Lower Right", teeth: [41, 42, 43, 44, 45, 46, 47, 48] },
];

export function NewPlanForm({
  patientId,
  patientName,
  patientCode,
  operations,
  doctors,
  currentDoctorId,
  existingPlan,
  chains,
}: {
  patientId: number;
  patientName: string;
  patientCode: number | string | null;
  operations: OperationOption[];
  doctors: DoctorOption[];
  currentDoctorId: number;
  existingPlan?: ExistingPlan;
  chains?: ChainOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!existingPlan;

  const [title, setTitle] = useState(existingPlan?.title ?? "");
  const [toothNumbers, setToothNumbers] = useState<number[]>([]);
  const [estimatedCost, setEstimatedCost] = useState<string>("");
  const [chainMode, setChainMode] = useState<"none" | "new" | "existing">("none");
  const [chainTitle, setChainTitle] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [items, setItems] = useState<PlanItemDraft[]>(() => {
    if (!existingPlan) return [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return existingPlan.items.map((item) => ({
      id: crypto.randomUUID(),
      label: item.label,
      operationId: item.operationId,
      assignedDoctorId: item.assignedDoctorId,
      estimatedDayGap: item.estimatedDayGap,
      scheduledDate: item.scheduledDate?.slice(0, 10) ?? todayStr,
      notes: item.notes,
      isCompleted: item.visitId !== null,
    }));
  });

  function toggleTooth(num: number) {
    setToothNumbers((prev) =>
      prev.includes(num) ? prev.filter((t) => t !== num) : [...prev, num].sort((a, b) => a - b),
    );
  }

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
    if (chainMode === "new" && !chainTitle.trim()) {
      toast.error("Please enter a chain title");
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
              scheduledDate: i.scheduledDate,
              notes: i.notes,
            }));
          await updateTreatmentPlan(existingPlan!.id, {
            title,
            items: uncompletedItems,
          });
          toast.success("Treatment plan updated");
        } else {
          const parsedCost = estimatedCost ? parseFloat(estimatedCost) : null;
          await createTreatmentPlan(
            patientId,
            title,
            items.map((i) => ({
              label: i.label,
              operationId: i.operationId,
              assignedDoctorId: i.assignedDoctorId,
              estimatedDayGap: i.estimatedDayGap,
              scheduledDate: i.scheduledDate,
              notes: i.notes,
            })),
            null, // notes
            null, // firstItemVisitId
            toothNumbers.length > 0 ? toothNumbers.join(",") : null,
            parsedCost && parsedCost > 0 ? parsedCost : null,
            chainMode === "existing" && selectedChainId ? selectedChainId : null,
            chainMode === "new" && chainTitle.trim() ? chainTitle.trim() : null,
          );
          toast.success("Treatment plan created");
        }
        router.push(`/patients/${patientId}`);
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : isEditMode
              ? "Failed to update plan"
              : "Failed to create plan",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Patient header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{isEditMode ? "Edit" : "New"} Treatment Plan</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="font-mono text-xs">
              #{patientCode}
            </Badge>
            <span>{patientName}</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plan Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. RCT + Crown tooth 36"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            {!isEditMode && (
              <div className="space-y-2">
                <Label>Estimated Cost (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {"\u20B9"}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tooth Number Selection */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label>Tooth Numbers (optional)</Label>
              <div className="rounded-md border p-3 space-y-2">
                {TOOTH_ROWS.map((row, rowIndex) => (
                  <div key={row.label} className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground w-16 shrink-0 text-right pr-2">
                      {row.label}
                    </span>
                    <div className="flex gap-0.5 flex-wrap">
                      {row.teeth.map((num) => {
                        const isSelected = toothNumbers.includes(num);
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => toggleTooth(num)}
                            className={`h-7 w-7 text-xs rounded transition-colors font-mono ${
                              isSelected
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "bg-muted/50 hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                    {/* Midline separator between rows 0-1 and 2-3 */}
                  </div>
                ))}
                {toothNumbers.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 border-t mt-2">
                    <span className="text-xs text-muted-foreground">Selected:</span>
                    <span className="text-sm font-medium font-mono">
                      {toothNumbers.join(", ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setToothNumbers([])}
                      className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Treatment Chain */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Treatment Chain (optional)
              </Label>
              <Select
                value={chainMode}
                onValueChange={(val) => {
                  setChainMode(val as "none" | "new" | "existing");
                  if (val === "none") {
                    setSelectedChainId(null);
                    setChainTitle("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No chain</SelectItem>
                  <SelectItem value="new">Create new chain</SelectItem>
                  {(chains ?? []).length > 0 && (
                    <SelectItem value="existing">Link to existing chain</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {chainMode === "new" && (
                <Input
                  placeholder="Chain title, e.g. Tooth 36 Treatment"
                  value={chainTitle}
                  onChange={(e) => setChainTitle(e.target.value)}
                />
              )}

              {chainMode === "existing" && (chains ?? []).length > 0 && (
                <Select
                  value={selectedChainId?.toString() ?? ""}
                  onValueChange={(val) => setSelectedChainId(parseInt(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a chain..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(chains ?? []).map((chain) => (
                      <SelectItem key={chain.id} value={chain.id.toString()}>
                        {chain.title}
                        {chain.toothNumbers && (
                          <span className="text-muted-foreground ml-1">
                            (teeth {chain.toothNumbers})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
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
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
              ? "Update Plan"
              : "Create Plan"}
        </Button>
      </div>
    </div>
  );
}
