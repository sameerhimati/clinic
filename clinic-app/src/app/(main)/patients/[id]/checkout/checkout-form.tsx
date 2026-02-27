"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { recordCheckoutPayment } from "./actions";
import { format } from "date-fns";
import { todayString } from "@/lib/validations";

type OutstandingVisit = {
  id: number;
  caseNo: number | null;
  visitDate: string;
  operationName: string;
  doctorName: string;
  billed: number;
  paid: number;
  balance: number;
};

type RecentReceipt = {
  id: number;
  receiptNo: number | null;
  receiptDate: string;
  amount: number;
  paymentMode: string;
  caseNo: number | null;
  operationName: string;
};

export function CheckoutForm({
  patientId,
  patientCode,
  patientName,
  outstandingVisits,
  recentReceipts,
}: {
  patientId: number;
  patientCode: number | null;
  patientName: string;
  outstandingVisits: OutstandingVisit[];
  recentReceipts: RecentReceipt[];
}) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const totalOutstanding = outstandingVisits.reduce(
    (s, v) => s + v.balance,
    0
  );
  const payAmount = parseFloat(paymentAmount) || 0;

  const totalAllocated = Object.values(allocations).reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0
  );

  const allocationMatch = payAmount > 0 && Math.abs(totalAllocated - payAmount) < 0.01;

  function autoAllocate(amount: number) {
    if (amount <= 0) {
      setAllocations({});
      return;
    }
    let remaining = amount;
    const newAllocations: Record<number, string> = {};

    // FIFO — oldest first (visits already sorted by visitDate asc)
    for (const visit of outstandingVisits) {
      if (remaining <= 0) break;
      const alloc = Math.min(remaining, visit.balance);
      if (alloc > 0) {
        newAllocations[visit.id] = alloc.toString();
        remaining = Math.round((remaining - alloc) * 100) / 100;
      }
    }

    setAllocations(newAllocations);
  }

  function handleSubmit() {
    setError("");

    if (payAmount <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }

    if (!allocationMatch) {
      setError(
        `Allocated amount (₹${totalAllocated.toLocaleString("en-IN")}) does not match payment amount (₹${payAmount.toLocaleString("en-IN")})`
      );
      return;
    }

    // Check no allocation exceeds balance
    for (const visit of outstandingVisits) {
      const alloc = parseFloat(allocations[visit.id] || "0");
      if (alloc > visit.balance + 0.01) {
        setError(
          `Allocation for Case #${visit.caseNo} exceeds outstanding balance of ₹${visit.balance.toLocaleString("en-IN")}`
        );
        return;
      }
    }

    const allocs = outstandingVisits
      .map((v) => ({
        visitId: v.id,
        amount: parseFloat(allocations[v.id] || "0"),
      }))
      .filter((a) => a.amount > 0);

    startTransition(async () => {
      try {
        await recordCheckoutPayment({
          patientId,
          paymentMode,
          paymentDate,
          allocations: allocs,
          notes: notes || undefined,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Payment failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Outstanding Visits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Outstanding Visits</span>
            <span className="text-base font-normal text-muted-foreground">
              Total: {"\u20B9"}{totalOutstanding.toLocaleString("en-IN")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {outstandingVisits.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No outstanding visits
            </p>
          ) : (
            outstandingVisits.map((visit) => {
              const allocValue = allocations[visit.id] || "";
              const allocNum = parseFloat(allocValue) || 0;
              const overAllocated = allocNum > visit.balance + 0.01;

              return (
                <div
                  key={visit.id}
                  className={`border rounded-lg p-4 space-y-2 ${allocNum > 0 ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span className="font-mono">Case #{visit.caseNo}</span>
                        <span>{visit.operationName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Dr. {visit.doctorName} ·{" "}
                        {format(new Date(visit.visitDate), "MMM d, yyyy")}
                      </div>
                    </div>
                    <Badge
                      variant="destructive"
                      className="text-sm font-mono"
                    >
                      Due: {"\u20B9"}{visit.balance.toLocaleString("en-IN")}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground flex gap-4">
                    <span>
                      Billed: {"\u20B9"}{visit.billed.toLocaleString("en-IN")}
                    </span>
                    <span>
                      Paid: {"\u20B9"}{visit.paid.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">
                      Allocate:
                    </Label>
                    <div className="relative flex-1 max-w-[200px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {"\u20B9"}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={visit.balance}
                        value={allocValue}
                        onChange={(e) =>
                          setAllocations((prev) => ({
                            ...prev,
                            [visit.id]: e.target.value,
                          }))
                        }
                        className={`pl-7 ${overAllocated ? "border-destructive" : ""}`}
                        placeholder="0"
                      />
                    </div>
                    {overAllocated && (
                      <span className="text-xs text-destructive">
                        Exceeds balance
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Payment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setPaymentAmount(val);
                  autoAllocate(parseFloat(val) || 0);
                }}
                placeholder="0.00"
                className="text-lg font-mono"
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

          <div className="flex items-center justify-end border-t pt-4">
            <div className="text-right">
              <div
                className={`text-sm font-medium ${
                  payAmount > 0 && !allocationMatch
                    ? "text-destructive"
                    : allocationMatch
                      ? "text-green-600"
                      : "text-muted-foreground"
                }`}
              >
                Allocated: {"\u20B9"}
                {totalAllocated.toLocaleString("en-IN")} / {"\u20B9"}
                {payAmount.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">
              {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isPending || !allocationMatch || payAmount <= 0}
            className="w-full"
            size="lg"
          >
            {isPending ? "Collecting..." : payAmount > 0 ? `Collect ₹${payAmount.toLocaleString("en-IN")}` : "Collect Payment"}
          </Button>
          {!allocationMatch && payAmount <= 0 && (
            <p className="text-sm text-muted-foreground text-center">Enter amount above to continue</p>
          )}
          {!allocationMatch && payAmount > 0 && (
            <p className="text-sm text-muted-foreground text-center">Adjust allocations to match ₹{payAmount.toLocaleString("en-IN")}</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      {recentReceipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentReceipts.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <span className="text-muted-foreground">
                      {format(new Date(r.receiptDate), "MMM d, yyyy")}
                    </span>
                    {r.receiptNo && (
                      <span className="ml-2 font-mono">Rcpt #{r.receiptNo}</span>
                    )}
                    <span className="ml-2">{r.operationName}</span>
                    {r.caseNo && (
                      <span className="ml-1 text-muted-foreground">
                        Case #{r.caseNo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {r.paymentMode}
                    </Badge>
                    <span className="font-medium font-mono">
                      {"\u20B9"}{r.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
