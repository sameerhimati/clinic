"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { createCorporatePartner, toggleCorporatePartner } from "./actions";

type Partner = {
  id: number;
  name: string;
  notes: string | null;
  isActive: boolean;
  patientCount: number;
};

export function CorporatePartnerList({ partners }: { partners: Partner[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  function handleAdd() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    startTransition(async () => {
      try {
        await createCorporatePartner(name.trim(), notes.trim() || undefined);
        toast.success("Partner added");
        setName("");
        setNotes("");
        setShowAdd(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function handleToggle(id: number) {
    startTransition(async () => {
      try {
        await toggleCorporatePartner(id);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      {showAdd ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Corporate Partner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company name"
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contact info, discount terms..."
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={isPending}>
                {isPending ? "Adding..." : "Add"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Partner
        </Button>
      )}

      {/* Partner list */}
      {partners.length > 0 ? (
        <div className="divide-y rounded-lg border">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    <span className="truncate">{p.name}</span>
                    {!p.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground truncate">{p.notes}</p>}
                  <p className="text-xs text-muted-foreground">{p.patientCount} {p.patientCount === 1 ? "patient" : "patients"}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToggle(p.id)}
                disabled={isPending}
                className="text-xs shrink-0"
              >
                {p.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No corporate partners yet</p>
        </div>
      )}
    </div>
  );
}
