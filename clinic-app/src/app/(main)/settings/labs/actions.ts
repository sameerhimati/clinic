"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit, logFlaggedAction } from "@/lib/audit";

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
  const currentUser = await requireAdmin();

  const labId = parseInt(formData.get("labId") as string);
  const itemName = (formData.get("itemName") as string).trim();
  const rate = parseFloat(formData.get("rate") as string) || 0;

  const maxCode = await prisma.labRate.aggregate({
    where: { labId },
    _max: { itemCode: true },
  });
  const nextCode = (maxCode._max.itemCode || 0) + 1;

  const labRate = await prisma.labRate.create({
    data: {
      labId,
      itemCode: nextCode,
      itemName,
      rate,
      isActive: true,
    },
  });

  logAudit({
    action: "LAB_RATE_CREATED",
    actorId: currentUser.id,
    entityType: "LabRate",
    entityId: labRate.id,
    details: { itemName, rate },
  });

  revalidatePath(`/settings/labs/${labId}`);
}

export async function updateLabRate(formData: FormData) {
  const currentUser = await requireAdmin();

  const id = parseInt(formData.get("id") as string);
  const labId = parseInt(formData.get("labId") as string);
  const newItemName = (formData.get("itemName") as string).trim();
  const newRate = parseFloat(formData.get("rate") as string) || 0;

  // Fetch old values for audit
  const oldRate = await prisma.labRate.findUnique({
    where: { id },
    select: { itemName: true, rate: true },
  });

  await prisma.labRate.update({
    where: { id },
    data: { itemName: newItemName, rate: newRate },
  });

  // Audit: log rate changes
  if (oldRate && oldRate.rate !== newRate) {
    logFlaggedAction({
      action: "LAB_RATE_CHANGE",
      actorId: currentUser.id,
      entityType: "LabRate",
      entityId: id,
      reason: `Rate change for ${oldRate.itemName}`,
      details: { itemName: oldRate.itemName, oldRate: oldRate.rate, newRate },
    });
  }

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
