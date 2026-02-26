"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil } from "lucide-react";
import { updateOperation } from "./actions";
import { toast } from "sonner";

export function OperationInlineEdit({
  id,
  currentFee,
}: {
  id: number;
  currentFee: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="font-mono text-sm tabular-nums flex items-center gap-1 hover:text-primary transition-colors"
        title="Click to edit tariff"
      >
        {currentFee != null && currentFee > 0
          ? `\u20B9${currentFee.toLocaleString("en-IN")}`
          : <span className="text-muted-foreground">No fee</span>}
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-1"
      action={(formData) => {
        formData.append("id", String(id));
        // Preserve existing name/category by not sending them — action will handle
        startTransition(async () => {
          try {
            await updateOperation(formData);
            setEditing(false);
            toast.success("Fee updated");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to update");
          }
        });
      }}
    >
      <Input
        name="defaultMinFee"
        type="number"
        step="1"
        min="0"
        defaultValue={currentFee ?? ""}
        className="w-24 h-7 text-sm"
        autoFocus
      />
      <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={isPending}>
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(false)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}
