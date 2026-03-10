"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type ChainPlanInput = {
  title: string;
  operationId?: number | null;
  items: {
    label: string;
    operationId?: number | null;
    assignedDoctorId?: number | null;
    estimatedDayGap?: number;
    estimatedCost?: number | null;
    estimatedLabCost?: number | null;
    labRateId?: number | null;
    scheduledDate?: string | null;
    notes?: string | null;
  }[];
};

export async function createTreatmentChain(
  patientId: number,
  title: string,
  toothNumbers: string,
  plans: ChainPlanInput[],
  notes?: string | null,
) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel > 3) {
    throw new Error("Unauthorized");
  }

  if (!title.trim()) throw new Error("Chain title is required");
  if (plans.length === 0) throw new Error("Chain must have at least one plan");

  const chain = await prisma.treatmentChain.create({
    data: {
      patientId,
      title: title.trim(),
      toothNumbers: toothNumbers.trim() || null,
      createdById: currentUser.id,
      notes: notes || null,
    },
  });

  // Create plans within the chain
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    if (plan.items.length === 0) continue;

    const estimatedTotal = plan.items.reduce((sum, item) => {
      return sum + (item.estimatedCost || 0) + (item.estimatedLabCost || 0);
    }, 0);

    await prisma.treatmentPlan.create({
      data: {
        patientId,
        chainId: chain.id,
        chainOrder: i + 1,
        title: plan.title.trim(),
        createdById: currentUser.id,
        estimatedTotal: estimatedTotal || null,
        items: {
          create: plan.items.map((item, idx) => ({
            sortOrder: idx + 1,
            label: item.label,
            operationId: item.operationId || null,
            assignedDoctorId: item.assignedDoctorId || null,
            estimatedDayGap: item.estimatedDayGap ?? 7,
            estimatedCost: item.estimatedCost || null,
            estimatedLabCost: item.estimatedLabCost || null,
            labRateId: item.labRateId || null,
            scheduledDate: item.scheduledDate ? new Date(item.scheduledDate) : null,
            notes: item.notes || null,
          })),
        },
      },
    });
  }

  logAudit({
    action: "CHAIN_CREATED",
    actorId: currentUser.id,
    patientId,
    entityType: "TreatmentChain",
    entityId: chain.id,
    details: { title, planCount: plans.length, toothNumbers },
  });

  revalidatePath(`/patients/${patientId}`);
  return { chainId: chain.id };
}

export async function addPlanToChain(
  chainId: number,
  plan: ChainPlanInput,
) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel > 3) {
    throw new Error("Unauthorized");
  }

  const chain = await prisma.treatmentChain.findUnique({
    where: { id: chainId },
    include: { plans: { select: { chainOrder: true } } },
  });
  if (!chain) throw new Error("Chain not found");

  const maxOrder = chain.plans.reduce((max, p) => Math.max(max, p.chainOrder || 0), 0);

  const estimatedTotal = plan.items.reduce((sum, item) => {
    return sum + (item.estimatedCost || 0) + (item.estimatedLabCost || 0);
  }, 0);

  await prisma.treatmentPlan.create({
    data: {
      patientId: chain.patientId,
      chainId: chain.id,
      chainOrder: maxOrder + 1,
      title: plan.title.trim(),
      createdById: currentUser.id,
      estimatedTotal: estimatedTotal || null,
      items: {
        create: plan.items.map((item, idx) => ({
          sortOrder: idx + 1,
          label: item.label,
          operationId: item.operationId || null,
          assignedDoctorId: item.assignedDoctorId || null,
          estimatedDayGap: item.estimatedDayGap ?? 7,
          estimatedCost: item.estimatedCost || null,
          estimatedLabCost: item.estimatedLabCost || null,
          labRateId: item.labRateId || null,
          scheduledDate: item.scheduledDate ? new Date(item.scheduledDate) : null,
          notes: item.notes || null,
        })),
      },
    },
  });

  logAudit({
    action: "PLAN_ADDED_TO_CHAIN",
    actorId: currentUser.id,
    patientId: chain.patientId,
    entityType: "TreatmentChain",
    entityId: chain.id,
    details: { chainTitle: chain.title, planTitle: plan.title, itemCount: plan.items.length },
  });

  revalidatePath(`/patients/${chain.patientId}`);
  return { success: true };
}

export async function getLabRates() {
  return prisma.labRate.findMany({
    where: { isActive: true },
    orderBy: [{ labId: "asc" }, { itemName: "asc" }],
    include: { lab: { select: { name: true } } },
  });
}
