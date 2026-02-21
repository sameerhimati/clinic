import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReceipt } from "../actions";
import { requireAuth } from "@/lib/auth";
import { canSeePayments } from "@/lib/permissions";

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ visitId?: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canSeePayments(currentUser.permissionLevel)) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const visits = await prisma.visit.findMany({
    orderBy: { visitDate: "desc" },
    take: 100,
    include: {
      patient: { select: { name: true, code: true } },
      operation: { select: { name: true } },
      receipts: { select: { amount: true } },
    },
  });

  // Enrich with balance info
  const visitsWithBalance = visits.map((v) => {
    const billed = (v.operationRate || 0) - v.discount;
    const paid = v.receipts.reduce((s, r) => s + r.amount, 0);
    return { ...v, billed, paid, balance: billed - paid };
  });

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">New Receipt</h2>

      <form action={createReceipt} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="visitId">
                Visit/Case <span className="text-destructive">*</span>
              </Label>
              <select
                name="visitId"
                required
                defaultValue={params.visitId || ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select visit...</option>
                {visitsWithBalance.map((v) => (
                  <option key={v.id} value={v.id}>
                    #{v.caseNo || v.id} - #{v.patient.code} {v.patient.name} - {v.operation?.name || "Visit"}
                    {v.balance > 0 ? ` (Due: ₹${v.balance.toLocaleString("en-IN")})` : " (Paid)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <select
                  name="paymentMode"
                  defaultValue="Cash"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="NEFT">NEFT</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptDate">Receipt Date</Label>
              <Input
                name="receiptDate"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea name="notes" rows={2} placeholder="Optional notes..." />
            </div>
          </CardContent>
        </Card>

        <Button type="submit">Create Receipt</Button>
      </form>
    </div>
  );
}
