"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createLabOrder } from "@/app/(main)/lab-orders/actions";
import { todayString } from "@/lib/validations";
import { toast } from "sonner";
import { CheckCircle2, FlaskConical } from "lucide-react";
import { toTitleCase } from "@/lib/format";

type LabData = {
  id: number;
  name: string;
  rates: { id: number; itemName: string; rate: number }[];
};

type PlanItemOption = {
  id: number;
  label: string;
};

export function LabOrderDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientCode,
  labs,
  planItems,
  defaultPlanItemId,
  defaultToothNumbers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName: string;
  patientCode: number | null;
  labs: LabData[];
  planItems?: PlanItemOption[];
  defaultPlanItemId?: number;
  defaultToothNumbers?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  // Form state
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [rateAdjustment, setRateAdjustment] = useState("0");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [orderedDate, setOrderedDate] = useState(todayString());
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [toothNumbers, setToothNumbers] = useState(defaultToothNumbers || "");
  const [planItemId, setPlanItemId] = useState<number | null>(defaultPlanItemId || null);

  const selectedLab = labs.find((l) => l.id === selectedLabId);
  const selectedRate = selectedLab?.rates.find((r) => r.id === selectedRateId);
  const unitRate = selectedRate?.rate || 0;
  const adj = parseFloat(rateAdjustment) || 0;
  const qty = parseFloat(quantity) || 1;
  const total = (unitRate + adj) * qty;

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedLabId(null);
      setSelectedRateId(null);
      setQuantity("1");
      setRateAdjustment("0");
      setAdjustmentNote("");
      setOrderedDate(todayString());
      setExpectedDate("");
      setNotes("");
      setToothNumbers(defaultToothNumbers || "");
      setPlanItemId(defaultPlanItemId || null);
      setSuccess(false);
    }
  }, [open, defaultToothNumbers, defaultPlanItemId]);

  function handleSubmit() {
    if (!selectedRateId) {
      toast.error("Please select a lab material");
      return;
    }
    if (adj !== 0 && !adjustmentNote.trim()) {
      toast.error("Please provide a reason for the rate adjustment");
      return;
    }

    startTransition(async () => {
      try {
        await createLabOrder({
          patientId,
          labRateId: selectedRateId,
          planItemId: planItemId || undefined,
          quantity: qty,
          rateAdjustment: adj,
          adjustmentNote: adjustmentNote.trim() || undefined,
          orderedDate,
          expectedDate: expectedDate || undefined,
          notes: notes.trim() || undefined,
          toothNumbers: toothNumbers.trim() || undefined,
        });
        setSuccess(true);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create lab order");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Order Lab Work</DialogTitle>
              <DialogDescription className="sr-only">Create a lab order for this patient</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-medium">Lab order created</p>
            <p className="text-sm text-muted-foreground">
              ₹{total.toLocaleString("en-IN")} · {selectedRate?.itemName}
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Patient badge */}
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <span className="font-mono mr-1">#{patientCode}</span>
              {toTitleCase(patientName)}
            </Badge>

            {/* Lab selector */}
            <div className="space-y-1.5">
              <Label>Lab <span className="text-destructive">*</span></Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={selectedLabId || ""}
                onChange={(e) => {
                  setSelectedLabId(e.target.value ? parseInt(e.target.value) : null);
                  setSelectedRateId(null);
                }}
              >
                <option value="">Select lab...</option>
                {labs.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Lab material selector */}
            {selectedLab && (
              <div className="space-y-1.5">
                <Label>Material <span className="text-destructive">*</span></Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={selectedRateId || ""}
                  onChange={(e) => setSelectedRateId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Select material...</option>
                  {selectedLab.rates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.itemName} {r.rate > 0 ? `(₹${r.rate.toLocaleString("en-IN")})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Rate display + adjustment */}
            {selectedRate && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Unit Rate</Label>
                  <div className="flex h-9 items-center px-3 rounded-md border bg-muted/30 text-sm font-medium tabular-nums">
                    ₹{unitRate.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Rate Adjustment (+/-)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={rateAdjustment}
                    onChange={(e) => setRateAdjustment(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            {/* Adjustment reason */}
            {adj !== 0 && (
              <div className="space-y-1.5">
                <Label>Adjustment Reason <span className="text-destructive">*</span></Label>
                <Input
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="Why is the rate different?"
                />
              </div>
            )}

            {/* Quantity */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tooth Numbers</Label>
                <Input
                  value={toothNumbers}
                  onChange={(e) => setToothNumbers(e.target.value)}
                  placeholder="e.g., 36, 37"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Order Date</Label>
                <Input
                  type="date"
                  value={orderedDate}
                  onChange={(e) => setOrderedDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expected Date</Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>

            {/* Plan item link */}
            {planItems && planItems.length > 0 && (
              <div className="space-y-1.5">
                <Label>Treatment Step</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={planItemId || ""}
                  onChange={(e) => setPlanItemId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">None (standalone order)</option>
                  {planItems.map((pi) => (
                    <option key={pi.id} value={pi.id}>{pi.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes..."
              />
            </div>

            {/* Total */}
            {selectedRate && (
              <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold tabular-nums">
                  ₹{total.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isPending || !selectedRateId}
            >
              {isPending ? "Creating..." : "Create Lab Order"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
