"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getToothName, TOOTH_STATUSES, getStatusColor, TOOTH_STATUS_INDICATORS, type ToothStatusKey } from "@/lib/dental";

export type ToothFindingOption = {
  id: number;
  name: string;
  category: string | null;
  color: string | null;
};

export type ToothUpdate = {
  toothNumber: number;
  status: string;
  findingId?: number;
  notes?: string;
};

type CurrentToothData = {
  status: string;
  findingId?: number;
  notes?: string;
};

type ToothHistoryEntry = {
  toothNumber: number;
  status: string;
  findingName?: string;
  date: string;
  doctorName: string;
  visitCaseNo?: number;
};

export function ToothDetailPanel({
  toothNumber,
  open,
  onOpenChange,
  findings,
  currentData,
  onSave,
  history,
}: {
  toothNumber: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findings: ToothFindingOption[];
  currentData?: CurrentToothData | null;
  onSave: (update: ToothUpdate) => void;
  history?: ToothHistoryEntry[];
}) {
  const [status, setStatus] = useState(currentData?.status || "HEALTHY");
  const [findingId, setFindingId] = useState<number | undefined>(currentData?.findingId);
  const [notes, setNotes] = useState(currentData?.notes || "");

  // Reset state when tooth changes
  const [prevTooth, setPrevTooth] = useState<number | null>(null);
  if (toothNumber !== prevTooth) {
    setPrevTooth(toothNumber);
    setStatus(currentData?.status || "HEALTHY");
    setFindingId(currentData?.findingId);
    setNotes(currentData?.notes || "");
  }

  if (!toothNumber) return null;

  // Group findings by category
  const groupedFindings = new Map<string, ToothFindingOption[]>();
  for (const f of findings) {
    const cat = f.category || "Other";
    if (!groupedFindings.has(cat)) groupedFindings.set(cat, []);
    groupedFindings.get(cat)!.push(f);
  }

  function handleSave() {
    if (!toothNumber) return;
    onSave({
      toothNumber,
      status,
      findingId,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            Tooth #{toothNumber}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {getToothName(toothNumber)}
          </p>
        </DialogHeader>

        <div className="space-y-5 mt-6">
          {/* Status selector */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TOOTH_STATUSES).map(([key, { label, color }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    status === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent cursor-pointer"
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status === key ? "#fff" : color }}
                  />
                  {label}
                </button>
              ))}
            </div>
            {/* Current status color indicator */}
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: getStatusColor(status) }}
              />
              <span className="text-xs text-muted-foreground">
                {TOOTH_STATUSES[status as ToothStatusKey]?.label || status}
              </span>
            </div>
          </div>

          {/* Finding selector */}
          <div className="space-y-2">
            <Label>Finding (optional)</Label>
            <select
              value={findingId || ""}
              onChange={(e) => setFindingId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">No specific finding</option>
              {Array.from(groupedFindings.entries()).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional tooth-specific notes..."
              rows={3}
            />
          </div>

          {/* Save */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">
              Save Tooth
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>

          {/* History timeline */}
          {history && history.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-muted-foreground">History</Label>
              <div className="space-y-1.5">
                {history.map((entry, i) => {
                  const indicator = TOOTH_STATUS_INDICATORS[entry.status] || "";
                  const color = getStatusColor(entry.status);
                  const statusLabel = TOOTH_STATUSES[entry.status as ToothStatusKey]?.label || entry.status;
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div
                        className="w-2 h-2 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {entry.date}
                        </span>
                        {" — "}
                        {statusLabel} {indicator}
                        {entry.findingName && ` (${entry.findingName})`}
                        {" · "}
                        {entry.doctorName}
                        {entry.visitCaseNo != null && (
                          <span className="text-muted-foreground/70"> (Case #{entry.visitCaseNo})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
