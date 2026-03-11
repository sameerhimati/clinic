"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Pencil, Wrench, CheckCircle2 } from "lucide-react";
import { TOOTH_STATUSES, type ToothStatusKey, inferToothStatus, getStatusLabel } from "@/lib/dental";

export type WorkDoneEntry = {
  id: string; // client-side ID for keying
  operationId: number;
  operationName: string;
  toothNumbers: number[];
  resultingStatus: string | null;
  planItemId: number | null;
  planItemLabel: string | null;
  notes: string;
};

type MatchingPlanItem = {
  id: number;
  label: string;
  operationId: number | null;
};

export function WorkDoneCard({
  entries,
  onAdd,
  onRemove,
  onEditTeeth,
  selectedTeeth,
  allOperations,
  activePlanItems,
  freeNotes,
  onFreeNotesChange,
}: {
  entries: WorkDoneEntry[];
  onAdd: (entry: WorkDoneEntry) => void;
  onRemove: (id: string) => void;
  onEditTeeth?: (teeth: number[]) => void;
  selectedTeeth: number[];
  allOperations: { id: number; name: string; category: string | null }[];
  activePlanItems?: MatchingPlanItem[];
  freeNotes?: string;
  onFreeNotesChange?: (notes: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [opSearch, setOpSearch] = useState("");
  const [selectedOp, setSelectedOp] = useState<{ id: number; name: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showStatusOverride, setShowStatusOverride] = useState(false);

  function resetForm() {
    setSelectedOp(null);
    setOpSearch("");
    setStatus(null);
    setNotes("");
    setShowForm(false);
    setShowStatusOverride(false);
  }

  function handleEdit(groupEntries: WorkDoneEntry[]) {
    const first = groupEntries[0];
    // Remove entries from list
    groupEntries.forEach((e) => onRemove(e.id));
    // Pre-fill the add form with entry's data
    setSelectedOp({ id: first.operationId, name: first.operationName });
    setStatus(first.resultingStatus);
    setNotes(first.notes);
    setShowForm(true);
    setShowStatusOverride(false);
    // Update parent's selected teeth to match the entry being edited
    const allTeeth = groupEntries.flatMap((e) => e.toothNumbers);
    onEditTeeth?.(allTeeth);
  }

  // Recently used operations from localStorage
  const RECENT_OPS_KEY = "work-done-recent-ops";
  const getRecentOps = (): { operationId: number; name: string }[] => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_OPS_KEY) || "[]");
    } catch { return []; }
  };
  const saveRecentOp = (opId: number, opName: string) => {
    try {
      const recent = getRecentOps().filter((r) => r.operationId !== opId);
      recent.unshift({ operationId: opId, name: opName });
      localStorage.setItem(RECENT_OPS_KEY, JSON.stringify(recent.slice(0, 5)));
    } catch { /* ignore */ }
  };

  function handleSelectOp(op: { id: number; name: string }) {
    saveRecentOp(op.id, op.name);
    setSelectedOp(op);
    setOpSearch("");
    const inferred = inferToothStatus(op.name);
    setStatus(inferred);
    setShowStatusOverride(false);
  }

  function handleAdd() {
    if (!selectedOp) return;
    const teethToUse = selectedTeeth.length > 0 ? selectedTeeth : [0]; // 0 = no tooth

    // Auto-match to plan item
    let matchedPlanItem: MatchingPlanItem | null = null;
    if (activePlanItems) {
      matchedPlanItem = activePlanItems.find(
        (pi) => pi.operationId === selectedOp.id && !entries.some((e) => e.planItemId === pi.id)
      ) || null;
    }

    for (const tooth of teethToUse) {
      if (tooth === 0) {
        // Non-tooth-specific procedure
        onAdd({
          id: crypto.randomUUID(),
          operationId: selectedOp.id,
          operationName: selectedOp.name,
          toothNumbers: [],
          resultingStatus: null,
          planItemId: matchedPlanItem?.id || null,
          planItemLabel: matchedPlanItem?.label || null,
          notes,
        });
      } else {
        onAdd({
          id: crypto.randomUUID(),
          operationId: selectedOp.id,
          operationName: selectedOp.name,
          toothNumbers: [tooth],
          resultingStatus: status,
          planItemId: matchedPlanItem?.id || null,
          planItemLabel: matchedPlanItem?.label || null,
          notes,
        });
        // Only use plan item for first tooth
        matchedPlanItem = null;
      }
    }
    resetForm();
  }

  const recentOps = typeof window !== "undefined" ? getRecentOps() : [];
  const recentOpsFull = !opSearch && recentOps.length > 0
    ? recentOps.map((r) => allOperations.find((op) => op.id === r.operationId)).filter(Boolean) as typeof allOperations
    : [];

  const filteredOps = opSearch
    ? allOperations.filter((op) => {
        const q = opSearch.toLowerCase();
        return op.name.toLowerCase().includes(q) || (op.category?.toLowerCase().includes(q) ?? false);
      }).slice(0, 8)
    : [];

  // Group entries by operation for display
  const groupedEntries = entries.reduce<Map<string, WorkDoneEntry[]>>((acc, entry) => {
    const key = `${entry.operationId}-${entry.resultingStatus || "none"}`;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(entry);
    return acc;
  }, new Map());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Work Done
          {entries.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({entries.length})</span>
          )}
        </CardTitle>
        {!showForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Existing entries */}
        {entries.length > 0 && (
          <div className="space-y-2.5">
            {Array.from(groupedEntries.entries()).map(([groupKey, groupEntries]) => {
              const first = groupEntries[0];
              const allTeeth = groupEntries.flatMap((e) => e.toothNumbers);
              return (
                <div key={groupKey} className="flex items-start justify-between gap-2 rounded-md border p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{first.operationName}</span>
                      {allTeeth.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {allTeeth.length === 1 ? `Tooth ${allTeeth[0]}` : `Teeth ${allTeeth.join(", ")}`}
                        </span>
                      )}
                      {first.resultingStatus && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          → {getStatusLabel(first.resultingStatus)}
                        </Badge>
                      )}
                      {first.planItemLabel && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          {first.planItemLabel}
                        </span>
                      )}
                    </div>
                    {first.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5">{first.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(groupEntries)}
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => groupEntries.forEach((e) => onRemove(e.id))}
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
            {/* Operation search */}
            <div className="space-y-1.5">
              <Label className="text-xs">Procedure</Label>
              {selectedOp ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedOp.name}</Badge>
                  <button
                    type="button"
                    onClick={() => { setSelectedOp(null); setStatus(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search procedures..."
                    value={opSearch}
                    onChange={(e) => setOpSearch(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                  {(filteredOps.length > 0 || recentOpsFull.length > 0) && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                      {recentOpsFull.length > 0 && !opSearch && (
                        <>
                          <div className="px-3 py-1 text-xs text-muted-foreground font-medium border-b bg-muted/30">Recent</div>
                          {recentOpsFull.map((op) => (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() => handleSelectOp(op)}
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                            >
                              <span className="font-medium">{op.name}</span>
                              {op.category && <span className="text-muted-foreground ml-2 text-xs">{op.category}</span>}
                            </button>
                          ))}
                        </>
                      )}
                      {filteredOps.map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => handleSelectOp(op)}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                        >
                          <span className="font-medium">{op.name}</span>
                          {op.category && <span className="text-muted-foreground ml-2 text-xs">{op.category}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedOp && (
              <>
                {/* Teeth indicator */}
                <div className="text-xs">
                  {selectedTeeth.length > 0 ? (
                    <span className="text-primary font-medium">
                      Teeth: {selectedTeeth.join(", ")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      No teeth selected — will record as general procedure
                    </span>
                  )}
                </div>

                {/* Resulting status */}
                {selectedTeeth.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Resulting Status</Label>
                      {status && !showStatusOverride && (
                        <button
                          type="button"
                          onClick={() => setShowStatusOverride(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Override
                        </button>
                      )}
                    </div>
                    {status && !showStatusOverride ? (
                      <Badge variant="outline">→ {getStatusLabel(status)}</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => { setStatus(null); setShowStatusOverride(false); }}
                          className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                            status === null ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-accent"
                          }`}
                        >
                          None
                        </button>
                        {(Object.keys(TOOTH_STATUSES) as ToothStatusKey[])
                          .filter((k) => k !== "HEALTHY")
                          .map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => { setStatus(key); setShowStatusOverride(false); }}
                              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                                status === key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-accent"
                              }`}
                            >
                              {TOOTH_STATUSES[key].label}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    placeholder="Brief procedure notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAdd}
                  >
                    Add Procedure
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Free-text notes — visible once work is recorded */}
        {onFreeNotesChange && entries.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t">
            <Label className="text-xs text-muted-foreground">Additional Notes</Label>
            <Textarea
              placeholder="General notes about today's procedures..."
              value={freeNotes || ""}
              onChange={(e) => onFreeNotesChange(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        )}

        {entries.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground">
            No procedures recorded for this visit yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
