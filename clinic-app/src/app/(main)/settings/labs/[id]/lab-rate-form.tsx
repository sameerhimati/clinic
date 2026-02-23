"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createLabRate } from "../actions";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function LabRateCreateForm({ labId }: { labId: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />Add Rate Item
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-4 mb-3">
      <form
        action={(formData) => {
          startTransition(async () => {
            try {
              await createLabRate(formData);
              setOpen(false);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Something went wrong");
            }
          });
        }}
        className="flex items-end gap-3 flex-wrap"
      >
        <input type="hidden" name="labId" value={labId} />
        <div className="space-y-1">
          <Label htmlFor="itemName" className="text-xs">Item Name</Label>
          <Input name="itemName" required placeholder="e.g., CER CROWN" className="w-48" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rate" className="text-xs">Rate (₹)</Label>
          <Input name="rate" type="number" step="0.01" min="0" defaultValue="0" className="w-28" />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Adding..." : "Add"}</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </form>
    </div>
  );
}
