import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { createReceipt } from "../actions";
import { ReceiptForm } from "./receipt-form";

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ visitId?: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canCollectPayments(currentUser.permissionLevel)) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  // Fetch all visits with receipt data to calculate balances
  const visits = await prisma.visit.findMany({
    orderBy: { visitDate: "desc" },
    include: {
      patient: { select: { name: true, code: true } },
      operation: { select: { name: true } },
      receipts: { select: { amount: true } },
    },
  });

  // Only show visits with outstanding balance > 0
  const pendingVisits = visits
    .map((v) => {
      const billed = (v.operationRate || 0) - v.discount;
      const paid = v.receipts.reduce((s, r) => s + r.amount, 0);
      const balance = billed - paid;
      return {
        id: v.id,
        caseNo: v.caseNo,
        visitDate: v.visitDate,
        operationRate: v.operationRate,
        discount: v.discount,
        patient: v.patient,
        operation: v.operation,
        billed,
        paid,
        balance,
      };
    })
    .filter((v) => v.balance > 0);

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">New Receipt</h2>

      {pendingVisits.length === 0 ? (
        <div className="rounded-md border bg-muted/50 p-8 text-center">
          <p className="text-lg font-medium">No pending bills</p>
          <p className="mt-1 text-sm text-muted-foreground">
            All visits have been fully paid. Receipts can only be created for
            visits with outstanding balance.
          </p>
        </div>
      ) : (
        <ReceiptForm
          visits={pendingVisits}
          defaultVisitId={params.visitId}
          action={createReceipt}
        />
      )}
    </div>
  );
}
