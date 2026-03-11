"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

export async function addClinicalNote(
  patientId: number,
  content: string,
  chainId?: number | null,
  visitId?: number | null,
) {
  const currentUser = await requireAuth();
  // C1: L3 doctors + L4 consultants can write notes; L1/L2 cannot
  if (currentUser.permissionLevel < 3) {
    throw new Error("Unauthorized");
  }

  if (!content.trim()) throw new Error("Note content is required");

  // C4: Validate chainId/visitId belong to this patient
  if (chainId) {
    const chain = await prisma.treatmentChain.findUnique({ where: { id: chainId }, select: { patientId: true } });
    if (!chain || chain.patientId !== patientId) throw new Error("Invalid chain");
  }
  if (visitId) {
    const visit = await prisma.visit.findUnique({ where: { id: visitId }, select: { patientId: true } });
    if (!visit || visit.patientId !== patientId) throw new Error("Invalid visit");
  }

  await prisma.clinicalNote.create({
    data: {
      patientId,
      chainId: chainId || null,
      visitId: visitId || null,
      doctorId: currentUser.id,
      content: content.trim(),
      noteDate: new Date(),
    },
  });

  revalidatePath(`/patients/${patientId}`);
  return { success: true };
}

export async function getPatientNotes(patientId: number) {
  // C2: Require authentication for read-only actions
  await requireAuth();
  return prisma.clinicalNote.findMany({
    where: { patientId },
    orderBy: { noteDate: "asc" },
    include: {
      doctor: { select: { name: true } },
      chain: { select: { id: true, title: true } },
    },
  });
}
