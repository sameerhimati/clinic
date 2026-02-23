"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";

export async function createReceipt(formData: FormData) {
  const currentDoctor = await requireAuth();
  const visitId = parseInt(formData.get("visitId") as string);
  const amount = parseFloat(formData.get("amount") as string);
  const paymentMode = formData.get("paymentMode") as string || "Cash";
  const receiptDate = formData.get("receiptDate")
    ? new Date(formData.get("receiptDate") as string)
    : new Date();
  const notes = formData.get("notes") as string || null;

  if (!visitId || !amount || amount <= 0) {
    throw new Error("Visit and amount are required");
  }

  // Validate visit has outstanding balance
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { receipts: { select: { amount: true } } },
  });

  if (!visit) {
    throw new Error("Visit not found");
  }

  const billed = (visit.operationRate || 0) - visit.discount;
  const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
  const balance = billed - paid;

  if (balance <= 0) {
    throw new Error("This visit has no outstanding balance. Receipts can only be created for pending bills.");
  }

  if (amount > balance) {
    throw new Error(`Amount ₹${amount} exceeds outstanding balance ₹${balance.toFixed(2)}`);
  }

  // Auto-generate receipt number
  const maxReceiptNo = await prisma.receipt.aggregate({ _max: { receiptNo: true } });
  const nextReceiptNo = (maxReceiptNo._max.receiptNo || 0) + 1;

  const receipt = await prisma.receipt.create({
    data: {
      visitId,
      amount,
      paymentMode,
      receiptDate,
      receiptNo: nextReceiptNo,
      notes,
      createdById: currentDoctor.id,
    },
  });

  revalidatePath("/receipts");
  revalidatePath(`/visits/${visitId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${visit.patientId}`);
  redirect(`/receipts/${receipt.id}/print`);
}
