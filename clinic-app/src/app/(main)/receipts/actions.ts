"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { toUserError } from "@/lib/action-utils";
import { receiptSchema, parseFormData } from "@/lib/validations";

export async function createReceipt(formData: FormData) {
  const currentDoctor = await requireAuth();
  const data = parseFormData(receiptSchema, formData);

  // Validate visit has outstanding balance
  const visit = await prisma.visit.findUnique({
    where: { id: data.visitId },
    include: { receipts: { select: { amount: true } } },
  });

  if (!visit) {
    throw new Error("Visit not found");
  }

  const billed = calcBilled(visit);
  const paid = calcPaid(visit.receipts);
  const balance = calcBalance(visit, visit.receipts);

  if (balance <= 0) {
    throw new Error("This visit has no outstanding balance. Receipts can only be created for pending bills.");
  }

  if (data.amount > balance) {
    throw new Error(`Amount ₹${data.amount} exceeds outstanding balance ₹${balance.toFixed(2)}`);
  }

  let receiptId: number;
  try {
    const maxReceiptNo = await prisma.receipt.aggregate({ _max: { receiptNo: true } });
    const nextReceiptNo = (maxReceiptNo._max.receiptNo || 0) + 1;

    const receipt = await prisma.receipt.create({
      data: {
        visitId: data.visitId,
        amount: data.amount,
        paymentMode: data.paymentMode,
        receiptDate: data.receiptDate,
        receiptNo: nextReceiptNo,
        notes: data.notes,
        createdById: currentDoctor.id,
      },
    });
    receiptId = receipt.id;
  } catch (error) {
    throw new Error(toUserError(error));
  }

  revalidatePath("/receipts");
  revalidatePath(`/visits/${data.visitId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${visit.patientId}`);
  redirect(`/receipts/${receiptId}/print`);
}
