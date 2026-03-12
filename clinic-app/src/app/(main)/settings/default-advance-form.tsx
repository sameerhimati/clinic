"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDefaultAdvance } from "./actions";
import { toast } from "sonner";

export function DefaultAdvanceForm({ currentAmount }: { currentAmount: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(currentAmount.toString());
  const [isPending, startTransition] = useTransition();
  const hasChanged = parseFloat(amount) !== currentAmount;

  function handleSave() {
    const value = parseFloat(amount);
    if (isNaN(value) || value < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    startTransition(async () => {
      try {
        await updateDefaultAdvance(value);
        toast.success("Default advance updated");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1.5 flex-1">
        <Label className="text-sm">Default advance amount ({"\u20B9"})</Label>
        <p className="text-xs text-muted-foreground">Prompted after scheduling follow-ups</p>
        <Input
          type="number"
          min={0}
          step={100}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32"
        />
      </div>
      {hasChanged && (
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
      )}
    </div>
  );
}
