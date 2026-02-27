"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  const data: Record<string, unknown> = {};

  // Support partial updates — only set fields that are present in the form
  if (formData.has("name")) data.name = (formData.get("name") as string).trim();
  if (formData.has("category")) data.category = (formData.get("category") as string)?.trim() || null;
  if (formData.has("defaultMinFee")) {
    const val = formData.get("defaultMinFee") as string;
    data.defaultMinFee = val ? parseFloat(val) : null;
  }
  if (formData.has("defaultMaxFee")) {
    const val = formData.get("defaultMaxFee") as string;
    data.defaultMaxFee = val ? parseFloat(val) : null;
  }

  await prisma.operation.update({ where: { id }, data });
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

export async function saveTreatmentSteps(
  operationId: number,
  steps: { name: string; description?: string; defaultDayGap: number }[]
) {
  await requireAdmin();

  // Delete all existing steps for this operation, then recreate
  await prisma.treatmentStep.deleteMany({ where: { operationId } });

  if (steps.length > 0) {
    await prisma.treatmentStep.createMany({
      data: steps.map((s, i) => ({
        operationId,
        stepNumber: i + 1,
        name: s.name.trim(),
        description: s.description?.trim() || null,
        defaultDayGap: Math.max(0, Math.round(s.defaultDayGap)),
      })),
    });
  }

  revalidatePath("/settings/operations");
}
