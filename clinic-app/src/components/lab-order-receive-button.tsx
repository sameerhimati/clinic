"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { receiveLabOrder } from "@/app/(main)/lab-orders/actions";
import { CheckCircle2 } from "lucide-react";

export function LabOrderReceiveButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-6 text-xs shrink-0"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            await receiveLabOrder(orderId);
            router.refresh();
            toast.success("Marked as received");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
    >
      <CheckCircle2 className="mr-1 h-3 w-3" />
      Received
    </Button>
  );
}
