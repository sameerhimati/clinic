"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createReceipt(formData: FormData) {
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

  const receipt = await prisma.receipt.create({
    data: {
      visitId,
      amount,
      paymentMode,
      receiptDate,
      notes,
    },
  });

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { patientId: true },
  });

  revalidatePath("/receipts");
  revalidatePath(`/visits/${visitId}`);
  revalidatePath("/dashboard");
  if (visit) revalidatePath(`/patients/${visit.patientId}`);
  redirect(`/visits/${visitId}`);
}
