"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, Pill } from "lucide-react";
import { toast } from "sonner";
import { createPrescription } from "@/app/(main)/visits/[id]/examine/prescription-actions";

type PrescriptionItemDraft = {
  id: string;
  drug: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const FREQUENCIES = ["OD", "BD", "TDS", "QDS", "SOS", "HS"];

const QUICK_MEDS = [
  { drug: "Amoxicillin 500mg", frequency: "TDS", duration: "5 days" },
  { drug: "Ibuprofen 400mg", frequency: "SOS", duration: "3 days" },
  { drug: "Omeprazole 20mg", frequency: "OD", duration: "5 days" },
  { drug: "Chlorhexidine MW 0.2%", frequency: "BD", duration: "2 weeks" },
  { drug: "Metronidazole 400mg", frequency: "TDS", duration: "5 days" },
  { drug: "Dolo 650mg", frequency: "SOS", duration: "3 days" },
  { drug: "Augmentin 625mg", frequency: "BD", duration: "5 days" },
  { drug: "Ketorol DT", frequency: "SOS", duration: "3 days" },
  { drug: "Ornidazole 500mg", frequency: "BD", duration: "5 days" },
  { drug: "Betadine Gargle", frequency: "TDS", duration: "1 week" },
];

export function PrescriptionSheet({
  open,
  onOpenChange,
  visitId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: number;
  onSuccess?: () => void;
}) {
  const [items, setItems] = useState<PrescriptionItemDraft[]>([]);
  const [notes, setNotes] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Manual entry fields
  const [drug, setDrug] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [instructions, setInstructions] = useState("");

  function addQuickMed(med: { drug: string; frequency: string; duration: string }) {
    // Don't add duplicates
    if (items.some((i) => i.drug === med.drug)) return;
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        drug: med.drug,
        dosage: "",
        frequency: med.frequency,
        duration: med.duration,
        instructions: "",
      },
    ]);
  }

  function addManual() {
    if (!drug.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        drug: drug.trim(),
        dosage: dosage.trim(),
        frequency,
        duration: duration.trim(),
        instructions: instructions.trim(),
      },
    ]);
    setDrug("");
    setDosage("");
    setFrequency("");
    setDuration("");
    setInstructions("");
    setShowManual(false);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleSave() {
    if (items.length === 0) {
      toast.error("Add at least one medication");
      return;
    }
    startTransition(async () => {
      try {
        await createPrescription(visitId, {
          items: items.map((i) => ({
            drug: i.drug,
            dosage: i.dosage || undefined,
            frequency: i.frequency || undefined,
            duration: i.duration || undefined,
            instructions: i.instructions || undefined,
          })),
          notes: notes || undefined,
        });
        toast.success("Prescription saved");
        setItems([]);
        setNotes("");
        onOpenChange(false);
        onSuccess?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save prescription");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Prescription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Quick-add pills */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quick Add</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_MEDS.map((med) => {
                const isAdded = items.some((i) => i.drug === med.drug);
                return (
                  <button
                    key={med.drug}
                    type="button"
                    onClick={() => addQuickMed(med)}
                    disabled={isAdded}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                      isAdded
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    {med.drug}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Medications ({items.length})</Label>
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                  <span className="text-xs text-muted-foreground mt-0.5">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.drug}</div>
                    <div className="text-xs text-muted-foreground">
                      {[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ")}
                    </div>
                    {item.instructions && (
                      <div className="text-xs text-muted-foreground italic mt-0.5">{item.instructions}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Manual entry */}
          {showManual ? (
            <div className="rounded-lg border p-3 space-y-2.5">
              <div className="space-y-1">
                <Label className="text-xs">Drug *</Label>
                <Input
                  value={drug}
                  onChange={(e) => setDrug(e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg"
                  className="text-sm"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Dosage</Label>
                  <Input
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 1 tab"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Frequency</Label>
                  <div className="flex flex-wrap gap-1">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFrequency(f === frequency ? "" : f)}
                        className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                          frequency === f
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-input hover:bg-accent"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Duration</Label>
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 5 days"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Instructions</Label>
                  <Input
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. After meals"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowManual(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={addManual} disabled={!drug.trim()}>
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowManual(true)}
              className="w-full"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Custom Medication
            </Button>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">General Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take after meals, avoid hot food..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={isPending || items.length === 0}
            className="w-full"
          >
            {isPending ? "Saving..." : `Prescribe ${items.length} medication${items.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
