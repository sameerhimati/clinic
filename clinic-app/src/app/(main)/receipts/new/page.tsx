import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { createReceipt } from "../actions";
import { ReceiptForm } from "./receipt-form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";

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
      const billed = calcBilled(v);
      const paid = calcPaid(v.receipts);
      const balance = calcBalance(v, v.receipts);
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
    <div className="max-w-3xl space-y-4">
      <Breadcrumbs items={[
        { label: "Receipts", href: "/receipts" },
        { label: "New Receipt" },
      ]} />
      <h2 className="text-2xl font-bold">New Receipt</h2>

      {pendingVisits.length === 0 ? (
        <div className="rounded-md border bg-muted/50 p-6 text-center text-muted-foreground">
          No pending bills
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
