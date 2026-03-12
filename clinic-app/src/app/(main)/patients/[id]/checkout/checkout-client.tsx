"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ScheduleFollowUpDialog, type ScheduleDefaults } from "@/components/schedule-followup-dialog";
import { recordEscrowDeposit } from "./actions";
import { todayString } from "@/lib/validations";
import { toast } from "sonner";
import {
  CheckCircle2,
  Printer,
  Stethoscope,
  IndianRupee,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";

type TodayVisit = {
  id: number;
  caseNo: number | null;
  operationName: string;
  doctorName: string | null;
  billed: number;
  paid: number;
  hasReport: boolean;
  operationRate: number;
  discount: number;
};

type Props = {
  patient: { id: number; code: number | null; name: string };
  todayVisits: TodayVisit[];
  financials: {
    totalBilled: number;
    totalCollected: number;
    outstanding: number;
    escrowDeposits: number;
  };
  doctors: { id: number; name: string }[];
};

export function CheckoutClient({ patient, todayVisits, financials, doctors }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    financials.outstanding > 0 ? financials.outstanding.toString() : ""
  );
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [lastPayment, setLastPayment] = useState<{ paymentId: number; receiptNo: number } | null>(null);

  // Schedule follow-up
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const payAmount = parseFloat(amount) || 0;
  const { totalBilled, totalCollected, outstanding } = financials;

  // Quick amounts: outstanding, then common denominations
  const quickAmounts: { amt: number; primary: boolean }[] = [];
  const seen = new Set<number>();
  if (outstanding > 0) {
    quickAmounts.push({ amt: outstanding, primary: true });
    seen.add(outstanding);
  }
  for (const amt of [500, 1000, 2000, 5000, 10000]) {
    if (!seen.has(amt) && amt <= outstanding * 2) {
      quickAmounts.push({ amt, primary: false });
    }
  }

  function handleSubmit() {
    if (payAmount <= 0) return;
    startTransition(async () => {
      try {
        const result = await recordEscrowDeposit({
          patientId: patient.id,
          amount: payAmount,
          paymentMode,
          paymentDate,
          notes: notes || undefined,
        });
        toast.success(`Collected \u20B9${payAmount.toLocaleString("en-IN")}`);
        setLastPayment(result);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Payment failed");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: patient.name, href: `/patients/${patient.id}` },
        { label: "Checkout" },
      ]} />

      {/* Patient header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-center shrink-0">
          <div className="text-lg font-bold font-mono">#{patient.code}</div>
        </div>
        <div>
          <h1 className="text-xl font-bold">{patient.name}</h1>
          <p className="text-sm text-muted-foreground">Checkout</p>
        </div>
      </div>

      {/* Today's visits */}
      {todayVisits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Today{"\u2019"}s Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {todayVisits.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {v.caseNo && (
                        <span className="font-mono text-xs text-muted-foreground">#{v.caseNo}</span>
                      )}
                      <span>{v.operationName}</span>
                      {v.hasReport && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-700 border-green-200 bg-green-50">
                          Examined
                        </Badge>
                      )}
                    </div>
                    {v.doctorName && (
                      <div className="text-xs text-muted-foreground">Dr. {v.doctorName}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-semibold">
                      {"\u20B9"}{v.billed.toLocaleString("en-IN")}
                    </div>
                    {v.discount > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        {"\u20B9"}{v.operationRate.toLocaleString("en-IN")} - {"\u20B9"}{v.discount.toLocaleString("en-IN")} disc
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial summary */}
      <Card className={outstanding > 0 ? "border-amber-200" : "border-green-200"}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Total Billed</div>
              <div className="text-xl font-bold font-mono">
                {"\u20B9"}{totalBilled.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Collected</div>
              <div className="text-xl font-bold font-mono text-green-700">
                {"\u20B9"}{totalCollected.toLocaleString("en-IN")}
              </div>
              {financials.escrowDeposits > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  incl. {"\u20B9"}{financials.escrowDeposits.toLocaleString("en-IN")} advance
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {outstanding > 0 ? "Outstanding" : "Status"}
              </div>
              <div className={`text-xl font-bold font-mono ${outstanding > 0 ? "text-red-700" : "text-green-700"}`}>
                {outstanding > 0
                  ? <>{"\u20B9"}{outstanding.toLocaleString("en-IN")}</>
                  : outstanding < 0
                  ? <>{"\u20B9"}{Math.abs(outstanding).toLocaleString("en-IN")} <span className="text-xs font-normal">credit</span></>
                  : "Paid up"
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment form or success */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Collect Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastPayment ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span className="text-sm text-green-800 font-medium">
                  Payment recorded (Receipt #{lastPayment.receiptNo})
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/patients/${patient.id}/checkout/${lastPayment.paymentId}/print`} target="_blank">
                      <Printer className="mr-1 h-3.5 w-3.5" />
                      Print Receipt
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setScheduleOpen(true)}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Schedule Follow-Up
                </Button>
                <Button className="flex-1" asChild>
                  <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          ) : outstanding <= 0 && totalBilled > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span className="text-sm text-green-800 font-medium">
                  All paid up — no balance due
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setScheduleOpen(true)}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Schedule Follow-Up
                </Button>
                <Button className="flex-1" asChild>
                  <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
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
              {quickAmounts.length > 0 && (
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
              )}

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Payment notes..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isPending || payAmount <= 0}
                  className="flex-1"
                  size="lg"
                >
                  {isPending ? "Processing..." : payAmount > 0 ? `Collect \u20B9${payAmount.toLocaleString("en-IN")}` : "Enter Amount"}
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href={`/patients/${patient.id}`}>
                    Skip
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Follow-Up Dialog */}
      <ScheduleFollowUpDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        patientId={patient.id}
        patientName={patient.name}
        patientCode={patient.code}
        doctors={doctors}
      />
    </div>
  );
}
