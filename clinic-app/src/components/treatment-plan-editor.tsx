"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GripVertical,
  Plus,
  Trash2,
  ListPlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/** YYYY-MM-DD string for today in local timezone */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Format YYYY-MM-DD to short display like "13 Mar" */
function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${d} ${date.toLocaleString("default", { month: "short" })}`;
}

export type PlanItemDraft = {
  id: string; // temp client ID
  label: string;
  operationId: number | null;
  assignedDoctorId: number | null;
  estimatedDayGap: number;
  scheduledDate: string; // YYYY-MM-DD
  notes: string | null;
  isCompleted?: boolean; // for editing existing plans
};

type OperationOption = {
  id: number;
  name: string;
  category: string | null;
};

type DoctorOption = {
  id: number;
  name: string;
};

type TemplateStep = {
  name: string;
  defaultDayGap: number;
  description: string | null;
};

export function TreatmentPlanEditor({
  items,
  onChange,
  operations,
  doctors,
  defaultDoctorId,
  onLoadTemplateSteps,
}: {
  items: PlanItemDraft[];
  onChange: (items: PlanItemDraft[]) => void;
  operations: OperationOption[];
  doctors: DoctorOption[];
  defaultDoctorId?: number | null;
  onLoadTemplateSteps?: (operationId: number) => Promise<TemplateStep[]>;
}) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const addItem = useCallback(() => {
    // New step defaults to the last step's date, or today
    const lastDate = items.length > 0 ? items[items.length - 1].scheduledDate : todayStr();
    const newItem: PlanItemDraft = {
      id: crypto.randomUUID(),
      label: "",
      operationId: null,
      assignedDoctorId: defaultDoctorId || null,
      estimatedDayGap: 0,
      scheduledDate: lastDate || todayStr(),
      notes: null,
    };
    onChange([...items, newItem]);
    setExpandedItem(newItem.id);
  }, [items, onChange, defaultDoctorId]);

  const updateItem = useCallback(
    (id: string, updates: Partial<PlanItemDraft>) => {
      onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    },
    [items, onChange],
  );

  const removeItem = useCallback(
    (id: string) => {
      onChange(items.filter((item) => item.id !== id));
    },
    [items, onChange],
  );

  const moveItem = useCallback(
    (index: number, direction: "up" | "down") => {
      const newItems = [...items];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newItems.length) return;
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      onChange(newItems);
    },
    [items, onChange],
  );

  const addOperationSteps = useCallback(
    async (operationId: number) => {
      if (!onLoadTemplateSteps) return;
      const steps = await onLoadTemplateSteps(operationId);
      if (steps.length === 0) return;

      // Start from the last existing item's date, or today
      const baseDate = items.length > 0 ? items[items.length - 1].scheduledDate : todayStr();
      let cumulativeDays = 0;

      const newItems: PlanItemDraft[] = steps.map((step, i) => {
        cumulativeDays += step.defaultDayGap;
        const d = new Date(baseDate + "T00:00:00");
        d.setDate(d.getDate() + cumulativeDays);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return {
          id: crypto.randomUUID(),
          label: step.name,
          operationId,
          assignedDoctorId: defaultDoctorId || null,
          estimatedDayGap: step.defaultDayGap,
          scheduledDate: dateStr,
          notes: step.description,
        };
      });

      onChange([...items, ...newItems]);
    },
    [items, onChange, defaultDoctorId, onLoadTemplateSteps],
  );

  /** When a step's date changes, bump any subsequent steps whose dates are earlier */
  const updateItemDate = useCallback(
    (id: string, newDate: string) => {
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) return;
      const updated = items.map((item, i) => {
        if (i === idx) return { ...item, scheduledDate: newDate };
        if (i > idx && item.scheduledDate < newDate) return { ...item, scheduledDate: newDate };
        return item;
      });
      onChange(updated);
    },
    [items, onChange],
  );

  // Operations that have treatment steps
  const [addingOperation, setAddingOperation] = useState(false);

  return (
    <div className="space-y-3">
      {/* Items list */}
      <div className="space-y-2">
        {items.map((item, index) => {
          const isExpanded = expandedItem === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-md border ${item.isCompleted ? "bg-muted/50 opacity-70" : "bg-card"}`}
            >
              {/* Compact row */}
              <div className="flex items-center gap-2 px-3 py-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
                  {index + 1}.
                </span>
                {item.isCompleted ? (
                  <span className="flex-1 text-sm line-through text-muted-foreground">
                    {item.label || "(untitled)"}
                  </span>
                ) : (
                  <Input
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                    placeholder="Step name..."
                    className="flex-1 h-8 text-sm"
                  />
                )}
                {/* Doctor name (compact) */}
                {item.assignedDoctorId && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Dr. {doctors.find((d) => d.id === item.assignedDoctorId)?.name || ""}
                  </span>
                )}
                {/* Scheduled date */}
                <span className="text-xs text-muted-foreground shrink-0 font-mono">
                  {formatDateShort(item.scheduledDate)}
                </span>
                {!item.isCompleted && (
                  <>
                    {/* Reorder */}
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="p-0.5 hover:bg-accent rounded disabled:opacity-30"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === items.length - 1}
                        className="p-0.5 hover:bg-accent rounded disabled:opacity-30"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    {/* Expand/collapse */}
                    <button
                      type="button"
                      onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                      className="p-1 hover:bg-accent rounded text-muted-foreground"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && !item.isCompleted && (
                <div className="px-3 pb-3 pt-1 border-t space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Operation</Label>
                      <Select
                        value={item.operationId?.toString() || "none"}
                        onValueChange={(val) =>
                          updateItem(item.id, {
                            operationId: val === "none" ? null : parseInt(val),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No operation</SelectItem>
                          {operations.map((op) => (
                            <SelectItem key={op.id} value={op.id.toString()}>
                              {op.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Assigned Doctor</Label>
                      <Select
                        value={item.assignedDoctorId?.toString() || "none"}
                        onValueChange={(val) =>
                          updateItem(item.id, {
                            assignedDoctorId: val === "none" ? null : parseInt(val),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Any doctor</SelectItem>
                          {doctors.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id.toString()}>
                              Dr. {doc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Scheduled Date</Label>
                    <Input
                      type="date"
                      min={index === 0 ? todayStr() : (items[index - 1]?.scheduledDate ?? todayStr())}
                      value={item.scheduledDate}
                      onChange={(e) => {
                        if (e.target.value) updateItemDate(item.id, e.target.value);
                      }}
                      className="h-8 text-sm w-40"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Step
        </Button>
        {onLoadTemplateSteps && (
          <>
            {addingOperation ? (
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(val) => {
                    addOperationSteps(parseInt(val));
                    setAddingOperation(false);
                  }}
                >
                  <SelectTrigger className="h-8 text-sm w-56">
                    <SelectValue placeholder="Select operation..." />
                  </SelectTrigger>
                  <SelectContent>
                    {operations.map((op) => (
                      <SelectItem key={op.id} value={op.id.toString()}>
                        {op.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingOperation(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddingOperation(true)}
              >
                <ListPlus className="mr-1 h-3.5 w-3.5" />
                Add Operation Steps
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
