"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { logFlaggedAction } from "@/lib/audit";

// W7: Validate date parsing
function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${s}`);
  return d;
}

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
  // W2: L1/L2/L3 can create; L4 cannot. Not using canCreateTreatmentPlans() as that's L3-only
  if (currentUser.permissionLevel > 3) {
    throw new Error("Unauthorized");
  }

  if (!title.trim()) throw new Error("Chain title is required");
  if (plans.length === 0) throw new Error("Chain must have at least one plan");

  // C5: Wrap chain + plan creation in transaction (also fixes W3 race on chainOrder)
  const chain = await prisma.$transaction(async (tx) => {
    const chain = await tx.treatmentChain.create({
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
      // W5: Throw on empty plan items instead of silent skip
      if (plan.items.length === 0) throw new Error("Each plan must have at least one step");

      const estimatedTotal = plan.items.reduce((sum, item) => {
        return sum + (item.estimatedCost || 0) + (item.estimatedLabCost || 0);
      }, 0);

      await tx.treatmentPlan.create({
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
              scheduledDate: parseDate(item.scheduledDate),
              notes: item.notes || null,
            })),
          },
        },
      });
    }

    return chain;
  });

  // W8: Upgrade to FLAG severity for chain creation audit
  logFlaggedAction({
    action: "CHAIN_CREATED",
    actorId: currentUser.id,
    patientId,
    entityType: "TreatmentChain",
    entityId: chain.id,
    reason: `Treatment chain "${title}" created`,
    details: { title, planCount: plans.length, toothNumbers },
  });

  revalidatePath(`/patients/${patientId}`);
  return { chainId: chain.id };
}

export async function addPlanToChain(
  chainId: number,
  plan: ChainPlanInput,
  patientId?: number, // C3: Optional for IDOR validation
) {
  const currentUser = await requireAuth();
  // W2: L1/L2/L3 can create; L4 cannot. Not using canCreateTreatmentPlans() as that's L3-only
  if (currentUser.permissionLevel > 3) {
    throw new Error("Unauthorized");
  }

  const chain = await prisma.treatmentChain.findUnique({
    where: { id: chainId },
    include: { plans: { select: { chainOrder: true } } },
  });
  if (!chain) throw new Error("Chain not found");

  // C3: IDOR fix — validate chain ownership
  if (patientId !== undefined && chain.patientId !== patientId) {
    throw new Error("Chain does not belong to this patient");
  }

  // W6: Validate items non-empty
  if (plan.items.length === 0) throw new Error("Plan must have at least one step");

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
          scheduledDate: parseDate(item.scheduledDate),
          notes: item.notes || null,
        })),
      },
    },
  });

  // W8: Upgrade to FLAG severity for plan addition audit
  logFlaggedAction({
    action: "PLAN_ADDED_TO_CHAIN",
    actorId: currentUser.id,
    patientId: chain.patientId,
    entityType: "TreatmentChain",
    entityId: chain.id,
    reason: `Plan "${plan.title}" added to chain "${chain.title}"`,
    details: { chainTitle: chain.title, planTitle: plan.title, itemCount: plan.items.length },
  });

  revalidatePath(`/patients/${chain.patientId}`);
  return { success: true };
}

export async function getLabRates() {
  // C2: Require authentication for read-only actions
  await requireAuth();
  return prisma.labRate.findMany({
    where: { isActive: true },
    orderBy: [{ labId: "asc" }, { itemName: "asc" }],
    include: { lab: { select: { name: true } } },
  });
}
