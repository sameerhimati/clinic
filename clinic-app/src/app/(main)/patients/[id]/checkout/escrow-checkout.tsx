"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { recordEscrowDeposit } from "./actions";
import { format } from "date-fns";
import { todayString } from "@/lib/validations";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

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
}: {
  patientId: number;
  escrow: EscrowData;
  suggestedAmount?: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(suggestedAmount ? suggestedAmount.toString() : "");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showHelp, setShowHelp] = useState(false);

  const payAmount = parseFloat(amount) || 0;

  function handleSubmit() {
    if (payAmount <= 0) return;
    startTransition(async () => {
      try {
        await recordEscrowDeposit({
          patientId,
          amount: payAmount,
          paymentMode,
          paymentDate,
          notes: notes || undefined,
        });
        toast.success(`Collected \u20B9${payAmount.toLocaleString("en-IN")} successfully`);
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
      label: `Deposit via ${p.paymentMode}`,
      detail: p.notes || p.createdByName,
      receiptNo: p.receiptNo,
    })),
    ...escrow.recentFulfillments.map((f) => ({
      type: "fulfillment" as const,
      date: f.fulfilledAt,
      amount: f.amount,
      label: `Procedure: ${f.operationName}`,
      detail: [
        f.doctorName ? `Dr. ${f.doctorName}` : null,
        f.caseNo ? `Case #${f.caseNo}` : null,
      ].filter(Boolean).join(" · "),
      receiptNo: null as number | null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* How does this work? — collapsible explainer */}
      <button
        type="button"
        onClick={() => setShowHelp(!showHelp)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
        <span>How does this work?</span>
        {showHelp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {showHelp && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4 pb-4">
            <div className="grid gap-4 sm:grid-cols-3 text-center text-sm">
              <div className="space-y-1.5">
                <div className="mx-auto w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">1</div>
                <div className="font-medium">Patient Pays</div>
                <div className="text-xs text-muted-foreground">Any amount collected goes into the patient&apos;s account balance</div>
              </div>
              <div className="space-y-1.5">
                <div className="mx-auto w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">2</div>
                <div className="font-medium">Balance Holds</div>
                <div className="text-xs text-muted-foreground">Money stays in the account until a procedure is completed</div>
              </div>
              <div className="space-y-1.5">
                <div className="mx-auto w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">3</div>
                <div className="font-medium">Auto-Deducted</div>
                <div className="text-xs text-muted-foreground">When a doctor marks &quot;Work Done&quot;, the fee is automatically deducted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Balance Card */}
      <Card className={escrow.balance >= 0 ? "border-green-200" : "border-red-200"}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Account Balance</div>
              <div className={`text-3xl font-bold font-mono ${escrow.balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                {"\u20B9"}{Math.abs(escrow.balance).toLocaleString("en-IN")}
              </div>
              {escrow.balance < 0 && (
                <div className="text-sm text-red-600 mt-0.5">Patient owes this amount</div>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground space-y-1">
              <div>Collected: {"\u20B9"}{escrow.deposits.toLocaleString("en-IN")}</div>
              <div>Deducted: {"\u20B9"}{escrow.fulfilled.toLocaleString("en-IN")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Collect Payment</CardTitle>
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
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="NEFT">NEFT</option>
                <option value="Cheque">Cheque</option>
              </select>
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

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Payment notes..."
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Payment goes into the patient&apos;s account. Automatically deducted when procedures are completed.
          </p>

          <Button
            onClick={handleSubmit}
            disabled={isPending || payAmount <= 0}
            className="w-full"
            size="lg"
          >
            {isPending ? "Processing..." : payAmount > 0 ? `Collect \u20B9${payAmount.toLocaleString("en-IN")}` : "Enter Amount"}
          </Button>
        </CardContent>
      </Card>

      {/* Payment History */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {timeline.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-1.5 ${item.type === "deposit" ? "bg-green-100" : "bg-blue-100"}`}>
                      {item.type === "deposit" ? (
                        <ArrowDown className="h-3.5 w-3.5 text-green-700" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5 text-blue-700" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(item.date), "dd-MM-yyyy")}
                        {item.detail && ` · ${item.detail}`}
                        {item.receiptNo && ` · Rcpt #${item.receiptNo}`}
                      </div>
                    </div>
                  </div>
                  <span className={`font-medium font-mono ${item.type === "deposit" ? "text-green-700" : "text-blue-700"}`}>
                    {item.type === "deposit" ? "+" : "-"}{"\u20B9"}{item.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
