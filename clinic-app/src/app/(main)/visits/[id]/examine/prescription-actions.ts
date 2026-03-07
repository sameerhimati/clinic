"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { canExamine, canCollectPayments } from "@/lib/permissions";

export async function createPrescription(
  visitId: number,
  data: {
    items: {
      drug: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }[];
    notes?: string;
  }
) {
  const currentUser = await requireAuth();
  if (!canExamine(currentUser.permissionLevel)) {
    throw new Error("Only doctors can create prescriptions");
  }

  if (!data.items || data.items.length === 0) {
    throw new Error("At least one medication item is required");
  }

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { patientId: true },
  });
  if (!visit) throw new Error("Visit not found");

  const prescription = await prisma.prescription.create({
    data: {
      visitId,
      doctorId: currentUser.id,
      patientId: visit.patientId,
      notes: data.notes || null,
      items: {
        create: data.items.map((item, index) => ({
          sortOrder: index + 1,
          drug: item.drug,
          dosage: item.dosage || null,
          frequency: item.frequency || null,
          duration: item.duration || null,
          instructions: item.instructions || null,
        })),
      },
    },
    include: { items: true },
  });

  revalidatePath(`/visits/${visitId}`);
  revalidatePath("/dashboard");
  return { prescriptionId: prescription.id };
}

export async function markPrescriptionPrinted(prescriptionId: number) {
  const currentUser = await requireAuth();
  if (!canCollectPayments(currentUser.permissionLevel)) {
    throw new Error("Only reception/admin can mark prescriptions as printed");
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    select: { visitId: true },
  });
  if (!prescription) throw new Error("Prescription not found");

  await prisma.prescription.update({
    where: { id: prescriptionId },
    data: {
      isPrinted: true,
      printedAt: new Date(),
      printedById: currentUser.id,
    },
  });

  revalidatePath(`/visits/${prescription.visitId}`);
  revalidatePath("/dashboard");
}

export async function getPendingPrescriptions() {
  const currentUser = await requireAuth();
  if (!canCollectPayments(currentUser.permissionLevel)) {
    return [];
  }

  return prisma.prescription.findMany({
    where: { isPrinted: false },
    include: {
      patient: { select: { id: true, code: true, name: true } },
      doctor: { select: { name: true } },
      visit: { select: { id: true, caseNo: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
