"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordEscrowDeposit } from "./actions";
import { format } from "date-fns";
import { todayString } from "@/lib/validations";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, CheckCircle2, Printer } from "lucide-react";
import Link from "next/link";

type EscrowPayment = {
  id: number;
  receiptNo: number | null;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  notes: string | null;
  createdByName: string;
};

type EscrowFulfillmentDisplay = {
  id: number;
  amount: number;
  operationName: string;
  caseNo: number | null;
  doctorName: string | null;
  fulfilledAt: string;
};

type EscrowData = {
  deposits: number;
  fulfilled: number;
  balance: number;
  recentPayments: EscrowPayment[];
  recentFulfillments: EscrowFulfillmentDisplay[];
};

export function EscrowCheckout({
  patientId,
  escrow,
  suggestedAmount,
  legacyOutstanding = 0,
}: {
  patientId: number;
  escrow: EscrowData;
  suggestedAmount?: number;
  legacyOutstanding?: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(suggestedAmount ? suggestedAmount.toString() : "");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showHistory, setShowHistory] = useState(false);
  const [lastPayment, setLastPayment] = useState<{ paymentId: number; receiptNo: number } | null>(null);

  const payAmount = parseFloat(amount) || 0;

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
        toast.success(`Collected \u20B9${payAmount.toLocaleString("en-IN")} successfully`);
        setLastPayment(result);
        setAmount("");
        setNotes("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Payment failed");
      }
    });
  }

  // Merge payments + fulfillments into timeline
  const timeline = [
    ...escrow.recentPayments.map((p) => ({
      type: "deposit" as const,
      date: p.paymentDate,
      amount: p.amount,
      label: `${p.paymentMode}`,
      detail: p.notes || p.createdByName,
      receiptNo: p.receiptNo,
    })),
    ...escrow.recentFulfillments.map((f) => ({
      type: "fulfillment" as const,
      date: f.fulfilledAt,
      amount: f.amount,
      label: f.operationName,
      detail: [
        f.doctorName ? `Dr. ${f.doctorName}` : null,
        f.caseNo ? `Case #${f.caseNo}` : null,
      ].filter(Boolean).join(" · "),
      receiptNo: null as number | null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      {/* Collect Payment — THE primary card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Collect Payment</CardTitle>

          {/* Balance summary — tells the money story clearly */}
          {(() => {
            const effectiveBalance = escrow.balance - legacyOutstanding;
            const totalOwed = escrow.fulfilled + legacyOutstanding;
            return (
              <div className={`mt-3 rounded-lg border px-4 py-3 ${effectiveBalance < 0 ? "border-red-200 bg-red-50/50" : "bg-muted/30"}`}>
                <div className={`grid gap-4 text-center ${legacyOutstanding > 0 ? "grid-cols-3" : "grid-cols-3"}`}>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Paid</div>
                    <div className="text-base font-semibold font-mono text-green-700">
                      {"\u20B9"}{escrow.deposits.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Billed</div>
                    <div className="text-base font-semibold font-mono text-muted-foreground">
                      {"\u20B9"}{totalOwed.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{effectiveBalance >= 0 ? "Credit" : "Due"}</div>
                    <div className={`text-lg font-bold font-mono ${effectiveBalance >= 0 ? "text-foreground" : "text-red-600"}`}>
                      {effectiveBalance < 0 && "-"}{"\u20B9"}{Math.abs(effectiveBalance).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardHeader>

        <CardContent className="space-y-4">
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
              <Label>Payment Mode</Label>
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
            {(() => {
              const effectiveBalance = escrow.balance - legacyOutstanding;
              const deficit = effectiveBalance < 0 ? Math.abs(effectiveBalance) : 0;
              const suggested = suggestedAmount && suggestedAmount > 0 ? suggestedAmount : 0;
              // Build quick buttons: suggested amount first (if set), then deficit, then standard amounts
              const quickAmounts: { amt: number; primary: boolean }[] = [];
              const seen = new Set<number>();
              if (suggested > 0) { quickAmounts.push({ amt: suggested, primary: true }); seen.add(suggested); }
              if (deficit > 0 && !seen.has(deficit)) { quickAmounts.push({ amt: deficit, primary: !suggested }); seen.add(deficit); }
              for (const amt of [500, 1000, 2000, 5000, 10000]) {
                if (!seen.has(amt)) quickAmounts.push({ amt, primary: false });
              }
              return quickAmounts.map(({ amt, primary }) => (
                <Button
                  key={amt}
                  size="sm"
                  variant={primary ? "default" : "outline"}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  className="h-7 text-xs"
                >
                  {"\u20B9"}{amt.toLocaleString("en-IN")}
                </Button>
              ));
            })()}
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

          {lastPayment && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-800 font-medium">Payment recorded (Receipt #{lastPayment.receiptNo})</span>
              <div className="flex gap-2 ml-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/patients/${patientId}/checkout/${lastPayment.paymentId}/print`}>
                    <Printer className="mr-1 h-3.5 w-3.5" />
                    Print
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/patients/${patientId}`}>Done</Link>
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Goes into patient account. Auto-deducted when procedures are completed.
          </p>
        </CardContent>
      </Card>

      {/* Payment History — collapsible */}
      {timeline.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <span>Payment History ({timeline.length})</span>
            {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showHistory && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {timeline.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className={`rounded-full p-1 ${item.type === "deposit" ? "bg-green-100" : "bg-blue-100"}`}>
                          {item.type === "deposit" ? (
                            <ArrowDown className="h-3 w-3 text-green-700" />
                          ) : (
                            <ArrowUp className="h-3 w-3 text-blue-700" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">{format(new Date(item.date), "dd MMM")} · </span>
                          <span className="font-medium text-sm">{item.label}</span>
                          {item.detail && <span className="text-xs text-muted-foreground"> · {item.detail}</span>}
                          {item.receiptNo && <span className="text-xs text-muted-foreground"> · #{item.receiptNo}</span>}
                        </div>
                      </div>
                      <span className={`font-medium font-mono text-sm ${item.type === "deposit" ? "text-green-700" : "text-blue-700"}`}>
                        {item.type === "deposit" ? "+" : "-"}{"\u20B9"}{item.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
