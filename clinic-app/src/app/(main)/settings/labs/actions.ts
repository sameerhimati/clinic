"use server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const doctor = await requireAuth();
  if (!canManageSystem(doctor.permissionLevel)) redirect("/dashboard");
  return doctor;
}

export async function createLab(formData: FormData) {
  await requireAdmin();

  const maxCode = await prisma.lab.aggregate({ _max: { code: true } });
  const nextCode = (maxCode._max.code || 0) + 1;

  const lab = await prisma.lab.create({
    data: {
      code: nextCode,
      name: (formData.get("name") as string).trim(),
      contactPhone: (formData.get("contactPhone") as string)?.trim() || null,
      contactEmail: (formData.get("contactEmail") as string)?.trim() || null,
      isActive: true,
    },
  });

  revalidatePath("/settings/labs");
  redirect(`/settings/labs/${lab.id}`);
}

export async function updateLab(formData: FormData) {
  await requireAdmin();

  const id = parseInt(formData.get("id") as string);

  await prisma.lab.update({
    where: { id },
    data: {
      name: (formData.get("name") as string).trim(),
      contactPhone: (formData.get("contactPhone") as string)?.trim() || null,
      contactEmail: (formData.get("contactEmail") as string)?.trim() || null,
    },
  });

  revalidatePath("/settings/labs");
  revalidatePath(`/settings/labs/${id}`);
}

export async function toggleLabActive(formData: FormData) {
  await requireAdmin();

  const id = parseInt(formData.get("id") as string);
  const lab = await prisma.lab.findUnique({ where: { id } });
  if (!lab) return;

  await prisma.lab.update({
    where: { id },
    data: { isActive: !lab.isActive },
  });

  revalidatePath("/settings/labs");
}

export async function createLabRate(formData: FormData) {
  await requireAdmin();

  const labId = parseInt(formData.get("labId") as string);

  const maxCode = await prisma.labRate.aggregate({
    where: { labId },
    _max: { itemCode: true },
  });
  const nextCode = (maxCode._max.itemCode || 0) + 1;

  await prisma.labRate.create({
    data: {
      labId,
      itemCode: nextCode,
      itemName: (formData.get("itemName") as string).trim(),
      rate: parseFloat(formData.get("rate") as string) || 0,
      isActive: true,
    },
  });

  revalidatePath(`/settings/labs/${labId}`);
}

export async function updateLabRate(formData: FormData) {
  await requireAdmin();

  const id = parseInt(formData.get("id") as string);
  const labId = parseInt(formData.get("labId") as string);

  await prisma.labRate.update({
    where: { id },
    data: {
      itemName: (formData.get("itemName") as string).trim(),
      rate: parseFloat(formData.get("rate") as string) || 0,
    },
  });

  revalidatePath(`/settings/labs/${labId}`);
}

export async function toggleLabRateActive(formData: FormData) {
  await requireAdmin();

  const id = parseInt(formData.get("id") as string);
  const labId = parseInt(formData.get("labId") as string);
  const lr = await prisma.labRate.findUnique({ where: { id } });
  if (!lr) return;

  await prisma.labRate.update({
    where: { id },
    data: { isActive: !lr.isActive },
  });

  revalidatePath(`/settings/labs/${labId}`);
}
