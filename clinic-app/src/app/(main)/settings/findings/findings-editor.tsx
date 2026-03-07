"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createFinding, updateFinding, toggleFindingActive } from "./actions";
import { toast } from "sonner";
import { Plus, Pencil, X } from "lucide-react";

type Finding = {
  id: number;
  name: string;
  category: string | null;
  color: string | null;
  isActive: boolean;
  _count: { toothStatuses: number };
};

const DEFAULT_CATEGORIES = ["Caries", "Structural", "Periodontal", "Prosthetic", "Other"];

export function FindingsEditor({
  findings,
  categories,
}: {
  findings: Finding[];
  categories: string[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Group by category
  const grouped = new Map<string, Finding[]>();
  for (const f of findings) {
    const cat = f.category || "Uncategorized";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(f);
  }

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categories])];

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createFinding(formData);
        setShowAdd(false);
        toast.success("Finding created");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create");
      }
    });
  }

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      try {
        await updateFinding(formData);
        setEditingId(null);
        toast.success("Finding updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  function handleToggle(formData: FormData) {
    startTransition(async () => {
      try {
        await toggleFindingActive(formData);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to toggle");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showAdd ? (
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Finding
        </Button>
      ) : (
        <Card>
          <CardContent className="p-4">
            <form action={handleCreate} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input name="name" placeholder="e.g., Root Resorption" required autoFocus />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <select
                    name="category"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Color</Label>
                  <Input name="color" type="color" defaultValue="#6b7280" className="h-9 w-20 p-1" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" type="submit" disabled={isPending}>
                  {isPending ? "Adding..." : "Add"}
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Grouped findings */}
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {category}
          </h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {items.map((f) => (
                  <div
                    key={f.id}
                    className={`px-3 py-2 text-sm flex items-center justify-between ${
                      !f.isActive ? "opacity-50" : ""
                    }`}
                  >
                    {editingId === f.id ? (
                      <form action={handleUpdate} className="flex items-center gap-2 flex-1">
                        <input type="hidden" name="id" value={f.id} />
                        <Input name="name" defaultValue={f.name} className="h-7 text-sm w-48" autoFocus />
                        <select
                          name="category"
                          defaultValue={f.category || "Other"}
                          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {allCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <Input name="color" type="color" defaultValue={f.color || "#6b7280"} className="h-7 w-10 p-0.5" />
                        <Button size="sm" variant="ghost" type="submit" disabled={isPending} className="h-7 text-xs">
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" type="button" onClick={() => setEditingId(null)} className="h-7 text-xs">
                          <X className="h-3 w-3" />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          {f.color && (
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: f.color }}
                            />
                          )}
                          <span className="font-medium">{f.name}</span>
                          {!f.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                          {f._count.toothStatuses > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({f._count.toothStatuses} {f._count.toothStatuses === 1 ? "use" : "uses"})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setEditingId(f.id)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <form action={handleToggle}>
                            <input type="hidden" name="id" value={f.id} />
                            <Button size="sm" variant="ghost" type="submit" disabled={isPending} className="h-7 text-xs">
                              {f.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </form>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
