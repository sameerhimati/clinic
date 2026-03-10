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
  if (currentUser.permissionLevel > 4) {
    throw new Error("Unauthorized");
  }

  if (!content.trim()) throw new Error("Note content is required");

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
  return prisma.clinicalNote.findMany({
    where: { patientId },
    orderBy: { noteDate: "asc" },
    include: {
      doctor: { select: { name: true } },
      chain: { select: { id: true, title: true } },
    },
  });
}
