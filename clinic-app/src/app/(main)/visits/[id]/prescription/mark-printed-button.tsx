"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { markPrescriptionPrinted } from "@/app/(main)/visits/[id]/examine/prescription-actions";
import { useRouter } from "next/navigation";

export function MarkPrintedButton({ prescriptionId }: { prescriptionId: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        await markPrescriptionPrinted(prescriptionId);
        toast.success("Marked as printed");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to mark as printed");
      }
    });
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={isPending}>
      <Check className="mr-1 h-3.5 w-3.5" />
      {isPending ? "Marking..." : "Mark Printed"}
    </Button>
  );
}
