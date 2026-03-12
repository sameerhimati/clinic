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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { toTitleCase } from "@/lib/format";
import { getOperationSteps } from "@/app/(main)/patients/[id]/plan/actions";
import { createTreatmentChain, addPlanToChain } from "@/app/(main)/patients/[id]/chain/actions";

type StepItem = {
  label: string;
  doctorId: number | null;
  dayGap: number;
};

type InlinePlanSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  mode: "new-chain" | "add-to-chain";
  chainId?: number;
  chainTitle?: string;
  chainTeeth?: string | null;
  selectedTeeth?: number[];
  allOperations: {
    id: number;
    name: string;
    category: string | null;
    stepCount: number;
    defaultMinFee?: number | null;
  }[];
  allDoctors: { id: number; name: string }[];
  defaultDoctorId: number;
  onSuccess: () => void;
};

// Valid FDI tooth numbers
const VALID_TEETH = new Set([
  11,12,13,14,15,16,17,18, 21,22,23,24,25,26,27,28,
  31,32,33,34,35,36,37,38, 41,42,43,44,45,46,47,48,
]);

export function InlinePlanSheet({
  open,
  onOpenChange,
  patientId,
  mode,
  chainId,
  chainTitle,
  chainTeeth: chainTeethStr,
  selectedTeeth: externalTeeth,
  allOperations,
  allDoctors,
  defaultDoctorId,
  onSuccess,
}: InlinePlanSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Operation picker
  const [operationPickerOpen, setOperationPickerOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<{
    id: number;
    name: string;
    defaultMinFee: number | null;
  } | null>(null);

  // Teeth — use external if provided, otherwise manage locally
  const [localTeeth, setLocalTeeth] = useState<number[]>([]);
  const [toothInput, setToothInput] = useState("");
  const teeth = externalTeeth && externalTeeth.length > 0 ? externalTeeth : localTeeth;
  const isMultiTooth = teeth.length > 1;

  // In add-to-chain mode, parse chain teeth for single-tooth picker
  const chainTeethList = chainTeethStr
    ? chainTeethStr.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && VALID_TEETH.has(n))
    : [];
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  // Chain title (new-chain mode)
  const [title, setTitle] = useState("");

  // Steps
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);

  // Suggested date for scheduling
  const [suggestedDate, setSuggestedDate] = useState("");

  // Group operations by category for the combobox
  const operationsByCategory = allOperations.reduce(
    (acc, op) => {
      const cat = op.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(op);
      return acc;
    },
    {} as Record<string, typeof allOperations>,
  );

  function resetForm() {
    setSelectedOperation(null);
    setTitle("");
    setSteps([]);
    setSuggestedDate("");
    setLocalTeeth([]);
    setToothInput("");
    setSelectedTooth(null);
  }

  function addTooth() {
    const num = parseInt(toothInput.trim());
    if (!num || !VALID_TEETH.has(num)) {
      toast.error("Enter a valid FDI tooth number (11-48)");
      return;
    }
    if (localTeeth.includes(num)) {
      toast.error(`Tooth ${num} already added`);
      return;
    }
    setLocalTeeth((prev) => [...prev, num].sort((a, b) => a - b));
    setToothInput("");
  }

  function removeTooth(num: number) {
    setLocalTeeth((prev) => prev.filter((t) => t !== num));
  }

  async function handleSelectOperation(operationId: number) {
    const op = allOperations.find((o) => o.id === operationId);
    if (!op) return;

    setSelectedOperation({
      id: op.id,
      name: op.name,
      defaultMinFee: op.defaultMinFee ?? null,
    });

    // Auto-set chain title with tooth numbers
    if (mode === "new-chain") {
      if (teeth.length > 0) {
        setTitle(`${op.name} — #${teeth.join(",")}`);
      } else {
        setTitle(op.name);
      }
    }

    setOperationPickerOpen(false);
    setLoadingSteps(true);

    try {
      const templateSteps = await getOperationSteps(operationId);
      if (templateSteps.length === 0) {
        setSteps([{ label: op.name, doctorId: defaultDoctorId, dayGap: 7 }]);
      } else {
        setSteps(
          templateSteps.map((s) => ({
            label: s.name,
            doctorId: defaultDoctorId,
            dayGap: s.defaultDayGap,
          })),
        );
      }
    } catch {
      setSteps([{ label: op.name, doctorId: defaultDoctorId, dayGap: 7 }]);
    } finally {
      setLoadingSteps(false);
    }
  }

  // Update title when teeth change after operation selected
  function updateTitleWithTeeth(newTeeth: number[]) {
    if (mode === "new-chain" && selectedOperation) {
      if (newTeeth.length > 0) {
        setTitle(`${selectedOperation.name} — #${newTeeth.sort((a, b) => a - b).join(",")}`);
      } else {
        setTitle(selectedOperation.name);
      }
    }
  }

  function updateStep(index: number, field: keyof StepItem, value: string | number | null) {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { label: "", doctorId: defaultDoctorId, dayGap: 7 },
    ]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!selectedOperation) {
      toast.error("Select an operation");
      return;
    }
    if (steps.length === 0 || steps.some((s) => !s.label.trim())) {
      toast.error("All steps need a label");
      return;
    }
    if (mode === "new-chain" && !title.trim()) {
      toast.error("Chain title is required");
      return;
    }

    startTransition(async () => {
      try {
        const toothNumbers = teeth.sort((a, b) => a - b).join(",");

        if (isMultiTooth && mode === "new-chain") {
          // Multi-tooth: create one plan per tooth
          const plans = teeth.map((tooth) => ({
            title: `${selectedOperation.name} Tooth ${tooth}`,
            operationId: selectedOperation.id,
            items: steps.map((s, idx) => ({
              label: s.label.trim(),
              operationId: selectedOperation.id,
              assignedDoctorId: s.doctorId,
              estimatedDayGap: s.dayGap,
              estimatedCost: idx === 0 ? (selectedOperation.defaultMinFee || null) : null,
              scheduledDate: suggestedDate || null,
            })),
          }));

          await createTreatmentChain(patientId, title.trim(), toothNumbers, plans);
          toast.success(`Treatment chain created with ${teeth.length} plans`);
        } else {
          // Single tooth or add-to-chain: one plan
          const planTitle = selectedTooth
            ? `${selectedOperation.name} Tooth ${selectedTooth}`
            : teeth.length === 1
              ? `${selectedOperation.name} Tooth ${teeth[0]}`
              : selectedOperation.name;
          const planInput = {
            title: planTitle,
            operationId: selectedOperation.id,
            items: steps.map((s, idx) => ({
              label: s.label.trim(),
              operationId: selectedOperation.id,
              assignedDoctorId: s.doctorId,
              estimatedDayGap: s.dayGap,
              estimatedCost: idx === 0 ? (selectedOperation.defaultMinFee || null) : null,
              scheduledDate: suggestedDate || null,
            })),
          };

          if (mode === "new-chain") {
            await createTreatmentChain(patientId, title.trim(), toothNumbers, [planInput]);
            toast.success("Treatment chain created");
          } else if (chainId) {
            await addPlanToChain(chainId, planInput, patientId);
            toast.success("Plan added to chain");
          }
        }

        resetForm();
        onOpenChange(false);
        onSuccess();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create plan");
      }
    });
  }

  const estimatedCost = selectedOperation?.defaultMinFee || 0;
  const totalEstimate = isMultiTooth ? estimatedCost * teeth.length : estimatedCost;
  const isCollapsed = steps.length <= 1;
  const hasExternalTeeth = externalTeeth && externalTeeth.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "new-chain" ? "New Treatment Chain" : "Add to Chain"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "new-chain"
              ? "Create a new treatment chain with auto-filled steps"
              : `Add a plan to "${chainTitle}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Add-to-chain badge + tooth picker */}
          {mode === "add-to-chain" && chainTitle && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Adding to:</span>
                <Badge variant="secondary">{chainTitle}</Badge>
              </div>
              {/* Tooth picker — select which tooth this plan is for */}
              {chainTeethList.length > 0 && (
                <div className="space-y-2">
                  <Label>For tooth</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {chainTeethList.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTooth(selectedTooth === t ? null : t)}
                        className={`px-3 py-1.5 rounded-md font-mono text-sm border transition-colors ${
                          selectedTooth === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-accent"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {!selectedTooth && (
                    <p className="text-xs text-muted-foreground">Pick a tooth, or leave unselected for a general plan</p>
                  )}
                </div>
              )}
              {/* Manual tooth input if chain has no teeth */}
              {chainTeethList.length === 0 && (
                <div className="space-y-2">
                  <Label>For tooth (optional)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={toothInput}
                      onChange={(e) => setToothInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const num = parseInt(toothInput.trim());
                          if (num && VALID_TEETH.has(num)) {
                            setSelectedTooth(num);
                            setToothInput("");
                          }
                        }
                      }}
                      placeholder="Tooth # (e.g. 36)"
                      className="h-8 text-sm w-32"
                      type="number"
                      min={11}
                      max={48}
                    />
                    {selectedTooth && (
                      <Badge variant="secondary" className="font-mono gap-1">
                        {selectedTooth}
                        <button type="button" onClick={() => setSelectedTooth(null)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Teeth selection — show pre-selected or let user add */}
          {mode === "new-chain" && (
            <div className="space-y-2">
              <Label>Teeth {hasExternalTeeth && <span className="text-xs text-muted-foreground font-normal">(from chart selection)</span>}</Label>
              {teeth.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {teeth.sort((a, b) => a - b).map((t) => (
                    <Badge key={t} variant="secondary" className="font-mono text-sm gap-1">
                      {t}
                      {!hasExternalTeeth && (
                        <button type="button" onClick={() => removeTooth(t)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No teeth selected — add teeth below or leave empty for general treatment</p>
              )}
              {!hasExternalTeeth && (
                <div className="flex gap-2">
                  <Input
                    value={toothInput}
                    onChange={(e) => setToothInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addTooth(); }
                    }}
                    placeholder="Enter tooth # (e.g. 36)"
                    className="h-8 text-sm w-32"
                    type="number"
                    min={11}
                    max={48}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={addTooth}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Operation picker */}
          <div className="space-y-2">
            <Label>Operation</Label>
            <Popover open={operationPickerOpen} onOpenChange={setOperationPickerOpen} modal>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={operationPickerOpen}
                  className="w-full justify-between font-normal h-9 text-sm"
                >
                  <span className="truncate">
                    {selectedOperation ? selectedOperation.name : "Select operation..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search operations..." />
                  <CommandList>
                    <CommandEmpty>No operations found.</CommandEmpty>
                    {Object.entries(operationsByCategory).map(([category, ops]) => (
                      <CommandGroup key={category} heading={category}>
                        {ops.map((op) => (
                          <CommandItem
                            key={op.id}
                            value={`${op.name} ${category}`}
                            onSelect={() => handleSelectOperation(op.id)}
                          >
                            <span className="flex-1">{op.name}</span>
                            {op.stepCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {op.stepCount} steps
                              </span>
                            )}
                            {selectedOperation?.id === op.id && (
                              <Check className="ml-2 h-3.5 w-3.5 text-primary" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Multi-tooth preview */}
          {isMultiTooth && selectedOperation && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Will create <span className="font-semibold">{teeth.length} plans</span> (one per tooth) with {steps.length} {steps.length === 1 ? "step" : "steps"} each
              {totalEstimate > 0 && (
                <> — Total estimate: <span className="font-semibold">₹{totalEstimate.toLocaleString("en-IN")}</span></>
              )}
            </div>
          )}

          {/* Chain title (new-chain only) */}
          {mode === "new-chain" && selectedOperation && (
            <div className="space-y-2">
              <Label>Chain Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tooth 36 Treatment"
              />
            </div>
          )}

          {/* Suggested date */}
          {selectedOperation && (
            <div className="space-y-2">
              <Label>Suggested Date (optional)</Label>
              <Input
                type="date"
                value={suggestedDate}
                onChange={(e) => setSuggestedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">Reception will see this when scheduling</p>
            </div>
          )}

          {/* Steps section */}
          {selectedOperation && !loadingSteps && steps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Steps ({steps.length})</Label>
                {estimatedCost > 0 && !isMultiTooth && (
                  <span className="text-sm text-muted-foreground">
                    Estimated: ₹{estimatedCost.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              {isCollapsed ? (
                // Single step — collapsed view
                <div className="rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">1.</span>
                    <span className="font-medium">{steps[0].label}</span>
                  </div>
                </div>
              ) : (
                // Multi-step — expanded view
                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs w-4 shrink-0">{idx + 1}.</span>
                        <Input
                          value={step.label}
                          onChange={(e) => updateStep(idx, "label", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addStep();
                            }
                          }}
                          placeholder="Step label"
                          className="h-8 text-sm"
                        />
                        {steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(idx)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2 ml-6">
                        <Select
                          value={step.doctorId?.toString() || ""}
                          onValueChange={(v) => updateStep(idx, "doctorId", v ? parseInt(v) : null)}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue placeholder="Doctor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allDoctors.map((d) => (
                              <SelectItem key={d.id} value={d.id.toString()} className="text-xs">
                                {toTitleCase(d.name)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={step.dayGap}
                            onChange={(e) => updateStep(idx, "dayGap", parseInt(e.target.value) || 0)}
                            className="h-7 w-16 text-xs"
                            min={0}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">days</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addStep}
                    className="flex items-center gap-1 text-xs text-primary hover:underline pl-6"
                  >
                    <Plus className="h-3 w-3" />
                    Add Step
                  </button>
                </div>
              )}
            </div>
          )}

          {loadingSteps && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading steps...
            </div>
          )}

          {/* Footer */}
          {selectedOperation && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isPending || steps.length === 0}
              >
                {isPending ? "Creating..." : isMultiTooth ? `Create ${teeth.length} Plans` : "Create"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
