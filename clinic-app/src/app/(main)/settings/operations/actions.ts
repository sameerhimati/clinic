"use server";

import { prisma } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { canManageRates } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logFlaggedAction } from "@/lib/audit";

export async function createOperation(formData: FormData) {
  const currentUser = await requireAuth();
  const isAdmin = canManageRates(currentUser.permissionLevel, currentUser.isSuperUser) || currentUser.permissionLevel <= 1;
  const isL3Super = currentUser.permissionLevel === 3 && currentUser.isSuperUser;
  if (!isAdmin && !isL3Super) {
    throw new Error("Permission denied");
  }

  const maxCode = await prisma.operation.aggregate({ _max: { code: true } });
  const nextCode = (maxCode._max.code || 0) + 1;

  await prisma.operation.create({
    data: {
      code: nextCode,
      name: (formData.get("name") as string).trim(),
      category: (formData.get("category") as string)?.trim() || null,
      // L3 super can only set name/category — fees are admin-only
      defaultMinFee: isAdmin && formData.get("defaultMinFee") ? parseFloat(formData.get("defaultMinFee") as string) : null,
      defaultMaxFee: isAdmin && formData.get("defaultMaxFee") ? parseFloat(formData.get("defaultMaxFee") as string) : null,
      doctorFee: isAdmin && formData.get("doctorFee") ? parseFloat(formData.get("doctorFee") as string) : null,
      labCostEstimate: isAdmin && formData.get("labCostEstimate") ? parseFloat(formData.get("labCostEstimate") as string) : null,
      isActive: true,
    },
  });

  revalidatePath("/settings/operations");
}

export async function updateOperation(formData: FormData) {
  const currentUser = await requireAuth();
  if (!canManageRates(currentUser.permissionLevel, currentUser.isSuperUser)) {
    throw new Error("Permission denied");
  }

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
  if (formData.has("doctorFee")) {
    const val = formData.get("doctorFee") as string;
    data.doctorFee = val ? parseFloat(val) : null;
  }
  if (formData.has("labCostEstimate")) {
    const val = formData.get("labCostEstimate") as string;
    data.labCostEstimate = val ? parseFloat(val) : null;
  }

  // Fetch old values for audit comparison
  const oldOp = await prisma.operation.findUnique({
    where: { id },
    select: { name: true, defaultMinFee: true, doctorFee: true },
  });

  await prisma.operation.update({ where: { id }, data });

  // Audit: log fee changes
  if (oldOp) {
    const newFee = data.defaultMinFee as number | null | undefined;
    const newDoctorFee = data.doctorFee as number | null | undefined;
    const feeChanged = newFee !== undefined && newFee !== oldOp.defaultMinFee;
    const doctorFeeChanged = newDoctorFee !== undefined && newDoctorFee !== oldOp.doctorFee;
    if (feeChanged || doctorFeeChanged) {
      logFlaggedAction({
        action: "OPERATION_RATE_CHANGE",
        actorId: currentUser.id,
        entityType: "Operation",
        entityId: id,
        reason: `Rate change for ${oldOp.name}`,
        details: {
          name: oldOp.name,
          ...(feeChanged ? { oldFee: oldOp.defaultMinFee, newFee } : {}),
          ...(doctorFeeChanged ? { oldDoctorFee: oldOp.doctorFee, newDoctorFee } : {}),
        },
      });
    }
  }

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
  steps: { name: string; description?: string; noteTemplate?: string; defaultDayGap: number; requiresLabWork?: boolean; defaultDoctorId?: number | null }[]
) {
  const currentUser = await requireAuth();
  const isAdmin = currentUser.permissionLevel <= 1;
  const isL3Super = currentUser.permissionLevel === 3 && currentUser.isSuperUser;
  if (!isAdmin && !isL3Super) {
    throw new Error("Permission denied");
  }

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
        noteTemplate: s.noteTemplate?.trim() || null,
        requiresLabWork: s.requiresLabWork ?? false,
        defaultDoctorId: s.defaultDoctorId || null,
      })),
    });
  }

  revalidatePath("/settings/operations");
}
