"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Link2,
  FlaskConical,
} from "lucide-react";
import { LabMaterialPicker, type LabRateOption } from "@/components/lab-material-picker";
import { createTreatmentChain } from "../actions";
import { getOperationSteps } from "@/app/(main)/patients/[id]/plan/actions";
import { toast } from "sonner";

type OperationOption = {
  id: number;
  name: string;
  category: string | null;
  defaultMaxFee: number | null;
  defaultMinFee: number | null;
  labCostEstimate: number | null;
  suggestsOperationId: number | null;
};

type DoctorOption = { id: number; name: string };

type PlanItemDraft = {
  id: string;
  label: string;
  operationId: number | null;
  assignedDoctorId: number | null;
  estimatedDayGap: number;
  estimatedCost: number | null;
  estimatedLabCost: number | null;
  labRateId: number | null;
  scheduledDate: string;
  notes: string | null;
};

type PlanDraft = {
  id: string;
  title: string;
  operationId: number | null;
  items: PlanItemDraft[];
  isCollapsed: boolean;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function NewChainForm({
  patientId,
  operations,
  doctors,
  labRates,
  currentDoctorId,
}: {
  patientId: number;
  operations: OperationOption[];
  doctors: DoctorOption[];
  labRates: LabRateOption[];
  currentDoctorId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [toothNumbers, setToothNumbers] = useState("");
  const [plans, setPlans] = useState<PlanDraft[]>([]);

  // Add a plan by selecting an operation
  const addPlan = useCallback(
    async (operationId?: number) => {
      const op = operationId ? operations.find((o) => o.id === operationId) : null;
      const newPlan: PlanDraft = {
        id: crypto.randomUUID(),
        title: op?.name || "Custom Plan",
        operationId: operationId || null,
        items: [],
        isCollapsed: false,
      };

      // Auto-load template steps if operation has them
      if (operationId) {
        try {
          const steps = await getOperationSteps(operationId);
          if (steps.length > 0) {
            newPlan.items = steps.map((step) => ({
              id: crypto.randomUUID(),
              label: step.name,
              operationId,
              assignedDoctorId: currentDoctorId,
              estimatedDayGap: step.defaultDayGap,
              estimatedCost: step.stepNumber === 1 ? (op?.defaultMinFee || null) : null,
              estimatedLabCost: null,
              labRateId: null,
              scheduledDate: "",
              notes: step.description || null,
            }));
          }
        } catch {
          // No template steps available
        }

        // If no template steps, add single item
        if (newPlan.items.length === 0) {
          newPlan.items = [
            {
              id: crypto.randomUUID(),
              label: op?.name || "Step 1",
              operationId,
              assignedDoctorId: currentDoctorId,
              estimatedDayGap: 0,
              estimatedCost: op?.defaultMinFee || null,
              estimatedLabCost: null,
              labRateId: null,
              scheduledDate: "",
              notes: null,
            },
          ];
        }
      }

      setPlans((prev) => [...prev, newPlan]);
    },
    [operations, currentDoctorId],
  );

  // Check for suggestsOperationId to auto-suggest next plan
  const suggestedNextOp = (() => {
    if (plans.length === 0) return null;
    const lastPlan = plans[plans.length - 1];
    if (!lastPlan.operationId) return null;
    const op = operations.find((o) => o.id === lastPlan.operationId);
    if (!op?.suggestsOperationId) return null;
    // Don't suggest if already added
    if (plans.some((p) => p.operationId === op.suggestsOperationId)) return null;
    return operations.find((o) => o.id === op.suggestsOperationId);
  })();

  const updatePlan = useCallback(
    (planId: string, updates: Partial<PlanDraft>) => {
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, ...updates } : p)),
      );
    },
    [],
  );

  const removePlan = useCallback((planId: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  }, []);

  const updateItem = useCallback(
    (planId: string, itemId: string, updates: Partial<PlanItemDraft>) => {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                items: p.items.map((i) =>
                  i.id === itemId ? { ...i, ...updates } : i,
                ),
              }
            : p,
        ),
      );
    },
    [],
  );

  const addItem = useCallback(
    (planId: string) => {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                items: [
                  ...p.items,
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    operationId: p.operationId,
                    assignedDoctorId: currentDoctorId,
                    estimatedDayGap: 7,
                    estimatedCost: null,
                    estimatedLabCost: null,
                    labRateId: null,
                    scheduledDate: "",
                    notes: null,
                  },
                ],
              }
            : p,
        ),
      );
    },
    [currentDoctorId],
  );

  const removeItem = useCallback((planId: string, itemId: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, items: p.items.filter((i) => i.id !== itemId) }
          : p,
      ),
    );
  }, []);

  // Calculate totals
  const planTotals = plans.map((plan) => {
    const cost = plan.items.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
    const labCost = plan.items.reduce((sum, i) => sum + (i.estimatedLabCost || 0), 0);
    return { cost, labCost, total: cost + labCost };
  });
  const grandTotal = planTotals.reduce((sum, t) => sum + t.total, 0);

  function handleSubmit() {
    if (!title.trim()) {
      toast.error("Please enter a chain title");
      return;
    }
    if (plans.length === 0) {
      toast.error("Add at least one plan");
      return;
    }
    for (const plan of plans) {
      if (plan.items.length === 0) {
        toast.error(`Plan "${plan.title}" needs at least one step`);
        return;
      }
      if (plan.items.some((i) => !i.label.trim())) {
        toast.error(`All steps in "${plan.title}" need a name`);
        return;
      }
    }

    startTransition(async () => {
      try {
        await createTreatmentChain(
          patientId,
          title,
          toothNumbers,
          plans.map((p) => ({
            title: p.title,
            operationId: p.operationId,
            items: p.items.map((i) => ({
              label: i.label,
              operationId: i.operationId,
              assignedDoctorId: i.assignedDoctorId,
              estimatedDayGap: i.estimatedDayGap,
              estimatedCost: i.estimatedCost,
              estimatedLabCost: i.estimatedLabCost,
              labRateId: i.labRateId,
              scheduledDate: i.scheduledDate || null,
              notes: i.notes,
            })),
          })),
        );
        toast.success("Treatment chain created");
        router.push(`/patients/${patientId}`);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to create chain",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Chain header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chain Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Tooth 36 Treatment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tooth Numbers</Label>
              <Input
                placeholder="e.g. 36 or 36,37"
                value={toothNumbers}
                onChange={(e) => setToothNumbers(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated FDI numbers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grand total banner */}
      {grandTotal > 0 && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">Chain Total</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      )}

      {/* Plans */}
      {plans.map((plan, planIndex) => {
        const totals = planTotals[planIndex];
        return (
          <Card key={plan.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                    {planIndex + 1}
                  </span>
                  <Input
                    value={plan.title}
                    onChange={(e) =>
                      updatePlan(plan.id, { title: e.target.value })
                    }
                    placeholder="Plan title..."
                    className="h-8 text-sm font-medium"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {totals.total > 0 && (
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      {formatCurrency(totals.total)}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updatePlan(plan.id, {
                        isCollapsed: !plan.isCollapsed,
                      })
                    }
                  >
                    {plan.isCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePlan(plan.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {!plan.isCollapsed && (
              <CardContent className="space-y-2 pt-0">
                {/* Steps */}
                {plan.items.map((item, itemIndex) => (
                  <div
                    key={item.id}
                    className="rounded-md border bg-card p-3 space-y-2"
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
                        {itemIndex + 1}.
                      </span>
                      <Input
                        value={item.label}
                        onChange={(e) =>
                          updateItem(plan.id, item.id, {
                            label: e.target.value,
                          })
                        }
                        placeholder="Step name..."
                        className="flex-1 h-8 text-sm"
                      />
                      {/* Cost display */}
                      {item.estimatedCost ? (
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          {formatCurrency(item.estimatedCost)}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeItem(plan.id, item.id)}
                        className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Detail row */}
                    <div className="grid gap-2 sm:grid-cols-4 pl-11">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Doctor
                        </Label>
                        <Select
                          value={item.assignedDoctorId?.toString() || "none"}
                          onValueChange={(val) =>
                            updateItem(plan.id, item.id, {
                              assignedDoctorId:
                                val === "none" ? null : parseInt(val),
                            })
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Any</SelectItem>
                            {doctors.map((d) => (
                              <SelectItem
                                key={d.id}
                                value={d.id.toString()}
                              >
                                Dr. {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Cost (₹)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.estimatedCost ?? ""}
                          onChange={(e) =>
                            updateItem(plan.id, item.id, {
                              estimatedCost: e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            })
                          }
                          className="h-7 text-xs"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Day Gap
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.estimatedDayGap}
                          onChange={(e) =>
                            updateItem(plan.id, item.id, {
                              estimatedDayGap: parseInt(e.target.value) || 0,
                            })
                          }
                          className="h-7 text-xs w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Target Date
                        </Label>
                        <Input
                          type="date"
                          value={item.scheduledDate}
                          onChange={(e) =>
                            updateItem(plan.id, item.id, {
                              scheduledDate: e.target.value,
                            })
                          }
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>

                    {/* Lab work row */}
                    <div className="pl-11 flex items-center gap-2">
                      <LabMaterialPicker
                        labRates={labRates}
                        value={item.labRateId}
                        onChange={(labRateId, rate) =>
                          updateItem(plan.id, item.id, {
                            labRateId,
                            estimatedLabCost: rate || null,
                          })
                        }
                      />
                      {item.estimatedLabCost ? (
                        <span className="text-xs text-muted-foreground">
                          <FlaskConical className="inline h-3 w-3 mr-0.5" />
                          Lab: {formatCurrency(item.estimatedLabCost)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}

                {/* Add step button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addItem(plan.id)}
                  className="w-full"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Step
                </Button>

                {/* Plan totals */}
                {totals.total > 0 && (
                  <div className="text-xs text-muted-foreground text-right pt-1 border-t space-x-3">
                    {totals.cost > 0 && (
                      <span>Procedure: {formatCurrency(totals.cost)}</span>
                    )}
                    {totals.labCost > 0 && (
                      <span>Lab: {formatCurrency(totals.labCost)}</span>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Add plan buttons */}
      <Card className="border-dashed">
        <CardContent className="py-4 flex flex-col gap-2 items-center">
          <div className="flex gap-2 flex-wrap justify-center">
            {/* Operation-based plan */}
            <Select
              onValueChange={(val) => addPlan(parseInt(val))}
              value=""
            >
              <SelectTrigger className="h-9 w-64 text-sm">
                <SelectValue placeholder="Add plan from operation..." />
              </SelectTrigger>
              <SelectContent>
                {operations.map((op) => (
                  <SelectItem key={op.id} value={op.id.toString()}>
                    {op.name}
                    {op.defaultMinFee
                      ? ` — ${formatCurrency(op.defaultMinFee)}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addPlan()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Custom Plan
            </Button>
          </div>

          {/* Auto-suggest next treatment */}
          {suggestedNextOp && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => addPlan(suggestedNextOp.id)}
            >
              <Link2 className="mr-1.5 h-3.5 w-3.5" />
              Suggested: Add {suggestedNextOp.name}
              {suggestedNextOp.defaultMinFee
                ? ` (${formatCurrency(suggestedNextOp.defaultMinFee)})`
                : ""}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Creating..." : "Create Chain"}
        </Button>
      </div>
    </div>
  );
}
