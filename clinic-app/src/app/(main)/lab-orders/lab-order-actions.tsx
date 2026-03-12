"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { receiveLabOrder, deleteLabOrder } from "./actions";
import { CheckCircle2, Trash2 } from "lucide-react";

export function LabOrderActions({
  orderId,
  status,
}: {
  orderId: number;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReceive() {
    startTransition(async () => {
      try {
        await receiveLabOrder(orderId);
        router.refresh();
        toast.success("Marked as received");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this lab order?")) return;
    startTransition(async () => {
      try {
        await deleteLabOrder(orderId);
        router.refresh();
        toast.success("Lab order deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  if (status !== "ORDERED") return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={handleReceive}
        disabled={isPending}
      >
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Received
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
