"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { logFlaggedAction } from "@/lib/audit";

type PlanItemInput = {
  label: string;
  operationId?: number | null;
  assignedDoctorId?: number | null;
  estimatedDayGap?: number;
  notes?: string | null;
};

export async function createTreatmentPlan(
  patientId: number,
  title: string,
  items: PlanItemInput[],
  notes?: string | null,
  firstItemVisitId?: number | null,
) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel > 3) {
    throw new Error("Unauthorized");
  }

  if (!title.trim()) throw new Error("Plan title is required");
  if (items.length === 0) throw new Error("Plan must have at least one item");

  const plan = await prisma.treatmentPlan.create({
    data: {
      patientId,
      title: title.trim(),
      createdById: currentUser.id,
      notes: notes || null,
      items: {
        create: items.map((item, index) => ({
          sortOrder: index + 1,
          label: item.label,
          operationId: item.operationId || null,
          assignedDoctorId: item.assignedDoctorId || null,
          estimatedDayGap: item.estimatedDayGap ?? 7,
          notes: item.notes || null,
          // If first item and a visit is provided, mark it completed
          ...(index === 0 && firstItemVisitId
            ? { visitId: firstItemVisitId, completedAt: new Date() }
            : {}),
        })),
      },
    },
    include: { items: true },
  });

  revalidatePath(`/patients/${patientId}`);
  return { planId: plan.id };
}

export async function updateTreatmentPlan(
  planId: number,
  data: {
    title?: string;
    status?: string;
    notes?: string | null;
    items?: PlanItemInput[];
  },
) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel > 3) {
    throw new Error("Unauthorized");
  }

  const plan = await prisma.treatmentPlan.findUnique({
    where: { id: planId },
    include: { items: true },
  });
  if (!plan) throw new Error("Plan not found");

  // Update plan fields
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;

  // If items provided, delete uncompleted items and recreate
  if (data.items) {
    // Keep completed items (those with visitId)
    const completedItemIds = plan.items
      .filter((i) => i.visitId !== null)
      .map((i) => i.id);

    // Delete only uncompleted items
    await prisma.treatmentPlanItem.deleteMany({
      where: {
        planId,
        id: { notIn: completedItemIds },
      },
    });

    // Determine next sortOrder after completed items
    const maxCompletedSort = plan.items
      .filter((i) => i.visitId !== null)
      .reduce((max, i) => Math.max(max, i.sortOrder), 0);

    // Create new uncompleted items
    await prisma.treatmentPlanItem.createMany({
      data: data.items.map((item, index) => ({
        planId,
        sortOrder: maxCompletedSort + index + 1,
        label: item.label,
        operationId: item.operationId || null,
        assignedDoctorId: item.assignedDoctorId || null,
        estimatedDayGap: item.estimatedDayGap ?? 7,
        notes: item.notes || null,
      })),
    });
  }

  await prisma.treatmentPlan.update({
    where: { id: planId },
    data: updateData,
  });

  // Audit: log plan modifications when items change
  if (data.items) {
    const completedCount = plan.items.filter((i) => i.visitId !== null).length;
    logFlaggedAction({
      action: "PLAN_MODIFIED",
      actorId: currentUser.id,
      patientId: plan.patientId,
      entityType: "TreatmentPlan",
      entityId: planId,
      reason: `Plan "${plan.items[0]?.label || 'Unknown'}" modified`,
      details: {
        planTitle: data.title || plan.items[0]?.label || "Unknown",
        previousItemCount: plan.items.length,
        newItemCount: completedCount + data.items.length,
      },
    });
  }

  revalidatePath(`/patients/${plan.patientId}`);
  return { success: true };
}

export async function completePlanItems(
  itemIds: number[],
  visitId: number,
) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel > 3) {
    throw new Error("Unauthorized");
  }

  if (itemIds.length === 0) return { success: true };

  // Verify items exist and are uncompleted
  const items = await prisma.treatmentPlanItem.findMany({
    where: { id: { in: itemIds }, visitId: null },
    include: { plan: { select: { patientId: true, id: true, items: true } } },
  });

  if (items.length === 0) throw new Error("No valid items to complete");

  const now = new Date();
  await prisma.treatmentPlanItem.updateMany({
    where: { id: { in: items.map((i) => i.id) } },
    data: { visitId, completedAt: now },
  });

  // Check if all items in the plan are now completed
  const plan = items[0].plan;
  const totalItems = plan.items.length;
  const completedBefore = plan.items.filter((i) => i.visitId !== null).length;
  const newlyCompleted = items.length;

  if (completedBefore + newlyCompleted >= totalItems) {
    await prisma.treatmentPlan.update({
      where: { id: plan.id },
      data: { status: "COMPLETED" },
    });
  }

  revalidatePath(`/patients/${plan.patientId}`);
  return { success: true };
}

export async function completePlan(planId: number) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel > 3) {
    throw new Error("Unauthorized");
  }

  const plan = await prisma.treatmentPlan.findUnique({
    where: { id: planId },
    select: { patientId: true },
  });
  if (!plan) throw new Error("Plan not found");

  await prisma.treatmentPlan.update({
    where: { id: planId },
    data: { status: "COMPLETED" },
  });

  revalidatePath(`/patients/${plan.patientId}`);
  return { success: true };
}

export async function cancelPlan(planId: number, reason?: string) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel > 3) {
    throw new Error("Unauthorized");
  }

  const plan = await prisma.treatmentPlan.findUnique({
    where: { id: planId },
    select: { patientId: true, title: true },
  });
  if (!plan) throw new Error("Plan not found");

  await prisma.treatmentPlan.update({
    where: { id: planId },
    data: { status: "CANCELLED" },
  });

  logFlaggedAction({
    action: "PLAN_CANCELLED",
    actorId: currentUser.id,
    patientId: plan.patientId,
    entityType: "TreatmentPlan",
    entityId: planId,
    reason: reason || "No reason provided",
    details: { planTitle: plan.title },
  });

  revalidatePath(`/patients/${plan.patientId}`);
  return { success: true };
}

export async function markStepDoneInSitting(planItemId: number, visitId: number) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel > 3) {
    throw new Error("Unauthorized");
  }

  const item = await prisma.treatmentPlanItem.findUnique({
    where: { id: planItemId },
    include: { plan: { select: { patientId: true, id: true, items: true } } },
  });
  if (!item) throw new Error("Plan item not found");
  if (item.visitId) throw new Error("Step already completed");

  // Verify the visit exists
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) throw new Error("Visit not found");

  await prisma.treatmentPlanItem.update({
    where: { id: planItemId },
    data: { visitId, completedAt: new Date() },
  });

  // Check if all items are now completed → auto-complete the plan
  const plan = item.plan;
  const completedBefore = plan.items.filter((i) => i.visitId !== null).length;
  if (completedBefore + 1 >= plan.items.length) {
    await prisma.treatmentPlan.update({
      where: { id: plan.id },
      data: { status: "COMPLETED" },
    });
  }

  revalidatePath(`/patients/${plan.patientId}`);
  return { success: true };
}

// Get treatment steps for an operation (used by plan editor)
export async function getOperationSteps(operationId: number) {
  return prisma.treatmentStep.findMany({
    where: { operationId },
    orderBy: { stepNumber: "asc" },
    select: {
      id: true,
      name: true,
      stepNumber: true,
      defaultDayGap: true,
      description: true,
    },
  });
}
