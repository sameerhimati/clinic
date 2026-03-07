"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { canCollectPayments } from "@/lib/permissions";

export async function recordCheckoutPayment(data: {
  patientId: number;
  paymentMode: string;
  paymentDate: string;
  allocations: { visitId: number; amount: number }[];
  notes?: string;
}) {
  const currentDoctor = await requireAuth();
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
    const balance = calcBalance(visit, visit.receipts);
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
          createdById: currentDoctor.id,
        },
      });
      nextReceiptNo++;
    }
  });

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/receipts");
  revalidatePath("/dashboard");
  revalidatePath("/visits");
  redirect(`/patients/${patientId}?paid=1`);
}

export async function recordEscrowDeposit(data: {
  patientId: number;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  notes?: string;
  appointmentId?: number;
}) {
  const currentDoctor = await requireAuth();
  if (!canCollectPayments(currentDoctor.permissionLevel)) {
    throw new Error("Only reception/admin can collect payments");
  }

  const { patientId, amount, paymentMode, paymentDate, notes, appointmentId } = data;

  if (amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  // Get next receipt number (shared sequence with Receipt)
  const [maxReceipt, maxPayment] = await Promise.all([
    prisma.receipt.aggregate({ _max: { receiptNo: true } }),
    prisma.patientPayment.aggregate({ _max: { receiptNo: true } }),
  ]);
  const nextReceiptNo = Math.max(maxReceipt._max.receiptNo || 0, maxPayment._max.receiptNo || 0) + 1;

  await prisma.patientPayment.create({
    data: {
      patientId,
      amount,
      paymentMode,
      paymentDate: new Date(paymentDate),
      notes: notes || null,
      appointmentId: appointmentId || null,
      receiptNo: nextReceiptNo,
      createdById: currentDoctor.id,
    },
  });

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/checkout`);
  revalidatePath("/dashboard");
}
