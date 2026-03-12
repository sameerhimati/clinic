"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordEscrowDeposit } from "@/app/(main)/patients/[id]/checkout/actions";
import { todayString } from "@/lib/validations";
import { toast } from "sonner";
import { CheckCircle2, Printer } from "lucide-react";
import Link from "next/link";

export function CollectPaymentDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientCode,
  escrowBalance,
  totalCollected,
  totalBilled,
  suggestedAmount,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName: string;
  patientCode: number | null;
  escrowBalance?: number;
  totalCollected?: number;
  totalBilled?: number;
  suggestedAmount?: number;
  onSuccess?: () => void;
}) {
  // Unified financial view: use totalCollected/totalBilled if available, fall back to escrowBalance
  const collected = totalCollected ?? escrowBalance ?? 0;
  const billed = totalBilled ?? 0;
  const outstanding = billed > 0 ? billed - collected : 0;
  const router = useRouter();
  const [amount, setAmount] = useState(suggestedAmount ? suggestedAmount.toString() : "");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [lastPayment, setLastPayment] = useState<{ paymentId: number; receiptNo: number } | null>(null);

  const payAmount = parseFloat(amount) || 0;

  function resetForm() {
    setAmount(suggestedAmount ? suggestedAmount.toString() : "");
    setPaymentMode("Cash");
    setPaymentDate(todayString());
    setNotes("");
    setLastPayment(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handleSubmit() {
    if (payAmount <= 0) return;
    startTransition(async () => {
      try {
        const result = await recordEscrowDeposit({
          patientId,
          amount: payAmount,
          paymentMode,
          paymentDate,
          notes: notes || undefined,
        });
        toast.success(`Collected \u20B9${payAmount.toLocaleString("en-IN")}`);
        setLastPayment(result);
        setAmount("");
        setNotes("");
        router.refresh();
        onSuccess?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Payment failed");
      }
    });
  }

  // Build quick-amount buttons
  const quickAmounts: { amt: number; primary: boolean }[] = [];
  const seen = new Set<number>();
  if (suggestedAmount && suggestedAmount > 0) {
    quickAmounts.push({ amt: suggestedAmount, primary: true });
    seen.add(suggestedAmount);
  }
  for (const amt of [500, 1000, 2000, 5000, 10000]) {
    if (!seen.has(amt)) quickAmounts.push({ amt, primary: false });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 text-center shrink-0">
              <div className="text-sm font-bold font-mono">#{patientCode}</div>
            </div>
            <div>
              <DialogTitle className="text-base">Collect Payment</DialogTitle>
              <p className="text-sm text-muted-foreground">{patientName}</p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Collect payment for patient {patientName}
          </DialogDescription>
        </DialogHeader>

        {/* Balance summary */}
        <div className="rounded-lg border px-4 py-3 bg-muted/30">
          <div className={`grid gap-4 text-center ${billed > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
            {billed > 0 && (
              <div>
                <div className="text-xs text-muted-foreground">Total Billed</div>
                <div className="text-lg font-bold font-mono">
                  {"\u20B9"}{billed.toLocaleString("en-IN")}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground">Collected</div>
              <div className="text-lg font-bold font-mono text-green-700">
                {"\u20B9"}{collected.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{outstanding > 0 ? "Outstanding" : "Status"}</div>
              <div className={`text-lg font-bold font-mono ${outstanding > 0 ? "text-red-700" : "text-green-700"}`}>
                {outstanding > 0
                  ? <>{"\u20B9"}{outstanding.toLocaleString("en-IN")}</>
                  : outstanding < 0
                  ? <>{"\u20B9"}{Math.abs(outstanding).toLocaleString("en-IN")} <span className="text-xs font-normal">credit</span></>
                  : "Paid up"
                }
              </div>
            </div>
          </div>
        </div>

        {lastPayment ? (
          /* Success state */
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                Payment recorded (Receipt #{lastPayment.receiptNo})
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/patients/${patientId}/checkout/${lastPayment.paymentId}/print`} target="_blank">
                    <Printer className="mr-1 h-3.5 w-3.5" />
                    Print
                  </Link>
                </Button>
                <Button size="sm" onClick={() => handleOpenChange(false)}>
                  Done
                </Button>
              </div>
            </div>
            <div className="text-center">
              <Link
                href={`/patients/${patientId}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View Patient →
              </Link>
            </div>
          </div>
        ) : (
          /* Payment form */
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Amount ({"\u20B9"})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-lg font-mono"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            {/* Quick-amount buttons */}
            <div className="flex gap-2 flex-wrap">
              {quickAmounts.map(({ amt, primary }) => (
                <Button
                  key={amt}
                  size="sm"
                  variant={primary ? "default" : "outline"}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  className={`h-7 text-xs ${String(amt) === amount ? "ring-2 ring-primary ring-offset-1" : ""}`}
                >
                  {"\u20B9"}{amt.toLocaleString("en-IN")}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Payment notes..."
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isPending || payAmount <= 0}
              className="w-full"
              size="lg"
            >
              {isPending ? "Processing..." : payAmount > 0 ? `Collect \u20B9${payAmount.toLocaleString("en-IN")}` : "Enter Amount"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
