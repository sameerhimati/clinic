"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canEditPatients, isAdmin } from "@/lib/permissions";
import { toUserError } from "@/lib/action-utils";
import { patientSchema, parseFormData } from "@/lib/validations";

export async function createPatient(formData: FormData) {
  const currentUser = await requireAuth();
  if (!canEditPatients(currentUser.permissionLevel)) {
    throw new Error("Insufficient permissions");
  }

  const data = parseFormData(patientSchema, formData);

  let patientId: number;
  try {
    const maxCode = await prisma.patient.aggregate({ _max: { code: true } });
    const nextCode = (maxCode._max.code || 10000) + 1;

    const patient = await prisma.patient.create({
      data: { ...data, code: nextCode },
    });
    patientId = patient.id;

    const diseaseIds = formData.getAll("diseases").map(Number).filter(Boolean);
    if (diseaseIds.length > 0) {
      await prisma.patientDisease.createMany({
        data: diseaseIds.map((diseaseId) => ({
          patientId: patient.id,
          diseaseId,
        })),
      });
    }
  } catch (error) {
    throw new Error(toUserError(error));
  }

  revalidatePath("/patients");
  redirect(`/patients/${patientId}`);
}

export async function updatePatient(id: number, formData: FormData) {
  const currentUser = await requireAuth();
  if (!canEditPatients(currentUser.permissionLevel)) {
    throw new Error("Insufficient permissions");
  }

  const data = parseFormData(patientSchema, formData);

  await prisma.patient.update({ where: { id }, data });

  const diseaseIds = formData.getAll("diseases").map(Number).filter(Boolean);
  await prisma.patientDisease.deleteMany({ where: { patientId: id } });
  if (diseaseIds.length > 0) {
    await prisma.patientDisease.createMany({
      data: diseaseIds.map((diseaseId) => ({
        patientId: id,
        diseaseId,
      })),
    });
  }

  revalidatePath(`/patients/${id}`);
  revalidatePath("/patients");
  redirect(`/patients/${id}`);
}

export async function updatePatientDiseases(patientId: number, diseaseIds: number[]) {
  const currentUser = await requireAuth();
  if (!canEditPatients(currentUser.permissionLevel)) {
    throw new Error("Insufficient permissions");
  }

  const uniqueIds = [...new Set(diseaseIds)].filter(id => Number.isInteger(id) && id > 0);
  if (uniqueIds.length > 50) throw new Error("Too many diseases");

  await prisma.patientDisease.deleteMany({ where: { patientId } });
  if (uniqueIds.length > 0) {
    await prisma.patientDisease.createMany({
      data: uniqueIds.map((diseaseId) => ({ patientId, diseaseId })),
    });
  }
  revalidatePath(`/patients/${patientId}`);
}

export async function deletePatient(id: number) {
  const currentUser = await requireAuth();
  if (!isAdmin(currentUser.permissionLevel)) {
    throw new Error("Insufficient permissions");
  }

  await prisma.patient.delete({ where: { id } });
  revalidatePath("/patients");
  redirect("/patients");
}
