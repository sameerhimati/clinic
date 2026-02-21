"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function recordCheckoutPayment(data: {
  patientId: number;
  paymentMode: string;
  paymentDate: string;
  allocations: { visitId: number; amount: number }[];
  notes?: string;
}) {
  const { patientId, paymentMode, paymentDate, allocations, notes } = data;

  // Validate
  const nonZero = allocations.filter((a) => a.amount > 0);
  if (nonZero.length === 0) {
    throw new Error("No allocations provided");
  }

  const totalAmount = nonZero.reduce((s, a) => s + a.amount, 0);
  if (totalAmount <= 0) {
    throw new Error("Total payment must be greater than zero");
  }

  // Validate each allocation doesn't exceed balance
  for (const alloc of nonZero) {
    const visit = await prisma.visit.findUnique({
      where: { id: alloc.visitId },
      include: { receipts: { select: { amount: true } } },
    });
    if (!visit) throw new Error(`Visit ${alloc.visitId} not found`);
    const billed = (visit.operationRate || 0) - visit.discount;
    const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
    const balance = billed - paid;
    if (alloc.amount > balance + 0.01) {
      throw new Error(`Allocation for visit ${alloc.visitId} exceeds outstanding balance`);
    }
  }

  // Create all receipts atomically
  await prisma.$transaction(async (tx) => {
    // Get current max receipt number
    const maxReceiptNo = await tx.receipt.aggregate({ _max: { receiptNo: true } });
    let nextReceiptNo = (maxReceiptNo._max.receiptNo || 0) + 1;

    for (const alloc of nonZero) {
      await tx.receipt.create({
        data: {
          visitId: alloc.visitId,
          amount: alloc.amount,
          paymentMode,
          receiptDate: new Date(paymentDate),
          receiptNo: nextReceiptNo,
          notes: notes || null,
        },
      });
      nextReceiptNo++;
    }
  });

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/receipts");
  revalidatePath("/dashboard");
  revalidatePath("/visits");
  redirect(`/patients/${patientId}`);
}
