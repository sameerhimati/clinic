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

  const isPositiveBalance = escrow.balance >= 0;

  return (
    <div className="space-y-6">
      {/* How does this work? — styled info card trigger */}
      <button
        type="button"
        onClick={() => setShowHelp(!showHelp)}
        className="w-full flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          <span className="font-medium">How does this work?</span>
        </div>
        {showHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {showHelp && (
        <Card className="border-blue-200 bg-blue-50/50">
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

      {/* Account Balance Hero Card */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className={`${isPositiveBalance ? "bg-green-600" : "bg-red-600"} px-6 py-5 text-center`}>
          <div className="text-sm font-medium text-white/80 uppercase tracking-wide">
            {isPositiveBalance ? "Account Balance" : "Patient Owes"}
          </div>
          <div className="text-4xl font-bold font-mono text-white mt-1">
            {"\u20B9"}{Math.abs(escrow.balance).toLocaleString("en-IN")}
          </div>
        </div>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Collected</div>
              <div className="text-lg font-semibold font-mono text-green-700 mt-0.5">
                {"\u20B9"}{escrow.deposits.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Deducted</div>
              <div className="text-lg font-semibold font-mono text-blue-700 mt-0.5">
                {"\u20B9"}{escrow.fulfilled.toLocaleString("en-IN")}
              </div>
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
            {[500, 1000, 2000, 5000, 10000].map((amt) => (
              <Button
                key={amt}
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setAmount(String(amt))}
              >
                +{"\u20B9"}{amt.toLocaleString("en-IN")}
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

          <p className="text-xs text-muted-foreground">
            Payment goes into the patient&apos;s account. Automatically deducted when procedures are completed.
          </p>

          <Button
            onClick={handleSubmit}
            disabled={isPending || payAmount <= 0}
            className={`w-full ${payAmount > 0 ? "bg-green-600 hover:bg-green-700" : ""}`}
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
            <div className="relative">
              {timeline.map((item, i) => (
                <div key={i} className="flex items-start justify-between px-4 py-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className={`rounded-full p-2 ${item.type === "deposit" ? "bg-green-100" : "bg-blue-100"}`}>
                        {item.type === "deposit" ? (
                          <ArrowDown className="h-4 w-4 text-green-700" />
                        ) : (
                          <ArrowUp className="h-4 w-4 text-blue-700" />
                        )}
                      </div>
                      {/* Connector line between entries */}
                      {i < timeline.length - 1 && (
                        <div className="w-px bg-border flex-1 min-h-[8px] mt-1" />
                      )}
                    </div>
                    <div className="pt-0.5">
                      <div className="font-medium">{format(new Date(item.date), "dd MMM yyyy")}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.label}
                        {item.detail && ` · ${item.detail}`}
                        {item.receiptNo && ` · Rcpt #${item.receiptNo}`}
                      </div>
                    </div>
                  </div>
                  <span className={`font-medium font-mono pt-0.5 ${item.type === "deposit" ? "text-green-700" : "text-blue-700"}`}>
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
