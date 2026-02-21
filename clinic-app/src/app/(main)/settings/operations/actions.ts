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

export async function createOperation(formData: FormData) {
  await requireAdmin();

  const maxCode = await prisma.operation.aggregate({ _max: { code: true } });
  const nextCode = (maxCode._max.code || 0) + 1;

  await prisma.operation.create({
    data: {
      code: nextCode,
      name: (formData.get("name") as string).trim(),
      category: (formData.get("category") as string)?.trim() || null,
      defaultMinFee: formData.get("defaultMinFee") ? parseFloat(formData.get("defaultMinFee") as string) : null,
      defaultMaxFee: formData.get("defaultMaxFee") ? parseFloat(formData.get("defaultMaxFee") as string) : null,
      isActive: true,
    },
  });

  revalidatePath("/settings/operations");
}

export async function updateOperation(formData: FormData) {
  await requireAdmin();

  const id = parseInt(formData.get("id") as string);

  await prisma.operation.update({
    where: { id },
    data: {
      name: (formData.get("name") as string).trim(),
      category: (formData.get("category") as string)?.trim() || null,
      defaultMinFee: formData.get("defaultMinFee") ? parseFloat(formData.get("defaultMinFee") as string) : null,
      defaultMaxFee: formData.get("defaultMaxFee") ? parseFloat(formData.get("defaultMaxFee") as string) : null,
    },
  });

  revalidatePath("/settings/operations");
}

export async function toggleOperationActive(formData: FormData) {
  await requireAdmin();

  const id = parseInt(formData.get("id") as string);
  const op = await prisma.operation.findUnique({ where: { id } });
  if (!op) return;

  await prisma.operation.update({
    where: { id },
    data: { isActive: !op.isActive },
  });

  revalidatePath("/settings/operations");
}
