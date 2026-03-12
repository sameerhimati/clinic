"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ChevronsUpDown, Check } from "lucide-react";
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
  const [findingOpen, setFindingOpen] = useState(false);

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

  const selectedFinding = findings.find((f) => f.id === findingId);
  const toothName = getToothName(toothNumber);
  const statusColor = getStatusColor(status);

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold font-mono text-sm"
              style={{ backgroundColor: statusColor }}
            >
              {toothNumber}
            </div>
            <div>
              <DialogTitle className="text-lg">Tooth #{toothNumber}</DialogTitle>
              <p className="text-sm text-muted-foreground">{toothName}</p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Edit status and findings for tooth {toothNumber} — {toothName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Status selector — grid layout */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(TOOTH_STATUSES).map(([key, { label, color }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    status === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent cursor-pointer"
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: status === key ? "#fff" : color }}
                  />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Finding selector — Combobox */}
          <div className="space-y-2">
            <Label>Finding (optional)</Label>
            <Popover open={findingOpen} onOpenChange={setFindingOpen} modal={false}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={findingOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedFinding ? (
                    <span className="flex items-center gap-2">
                      {selectedFinding.color && (
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: selectedFinding.color }}
                        />
                      )}
                      {selectedFinding.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No specific finding</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" disablePortal>
                <Command>
                  <CommandInput placeholder="Search findings..." />
                  <CommandList className="max-h-[200px] overscroll-contain">
                    <CommandEmpty>No findings found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          setFindingId(undefined);
                          setFindingOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${findingId === undefined ? "opacity-100" : "opacity-0"}`} />
                        No specific finding
                      </CommandItem>
                    </CommandGroup>
                    {Array.from(groupedFindings.entries()).map(([cat, items]) => (
                      <CommandGroup key={cat} heading={cat}>
                        {items.map((f) => (
                          <CommandItem
                            key={f.id}
                            value={f.name}
                            onSelect={() => {
                              setFindingId(f.id);
                              setFindingOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${findingId === f.id ? "opacity-100" : "opacity-0"}`} />
                            {f.color && (
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: f.color }}
                              />
                            )}
                            {f.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-muted-foreground">History</Label>
              <div className="relative pl-6 space-y-3">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                {history.map((entry, i) => {
                  const color = getStatusColor(entry.status);
                  const statusLabel = TOOTH_STATUSES[entry.status as ToothStatusKey]?.label || entry.status;
                  return (
                    <div key={i} className="relative">
                      <div
                        className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-background"
                        style={{ backgroundColor: color }}
                      />
                      <div className="text-xs">
                        <span className="font-medium text-foreground">
                          {entry.date}
                        </span>
                        <span className="text-muted-foreground">
                          {" — "}
                          {statusLabel}
                          {entry.findingName && ` (${entry.findingName})`}
                          {" · "}
                          {entry.doctorName}
                        </span>
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
