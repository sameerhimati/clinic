"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { toUserError } from "@/lib/action-utils";
import { maxDiscountPercent, canExamine } from "@/lib/permissions";
import { logFlaggedAction } from "@/lib/audit";

// --- Quick Visit (returns visitId instead of redirecting) ---

type QuickVisitInput = {
  patientId: number;
  operationId?: number;
  operationRate: number;
  discount: number;
  quantity?: number;
  doctorId?: number;
  visitDate: string;
  visitType: "NEW" | "FOLLOWUP";
  parentVisitId?: number;
  stepLabel?: string;
  notes?: string;
  labId?: number;
  labRateId?: number;
  labRateAmount?: number;
  labQuantity?: number;
  appointmentId?: number;
  planItemId?: number;
  discountReason?: string;
};

export async function createQuickVisit(data: QuickVisitInput): Promise<{ visitId: number }> {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel >= 3) {
    throw new Error("Use appointment workflow to create visits");
  }

  if (!data.patientId) throw new Error("Patient is required");

  const doctorId = currentUser.id;

  // Rate: always use tariff
  const rawRate = data.operationId
    ? (await prisma.operation.findUnique({ where: { id: data.operationId }, select: { defaultMinFee: true } }))?.defaultMinFee || 0
    : 0;

  // Discount validation using role-based limits
  let validatedDiscount = data.discount;
  if (rawRate > 0 && validatedDiscount > 0) {
    const discountPercent = (validatedDiscount / rawRate) * 100;
    const maxPct = maxDiscountPercent(currentUser.permissionLevel, currentUser.isSuperUser);
    if (discountPercent > maxPct + 0.5) {
      throw new Error(`Discount exceeds your authorized limit (${maxPct}%)`);
    }
    validatedDiscount = Math.min(validatedDiscount, rawRate);
  }

  const maxCase = await prisma.visit.aggregate({ _max: { caseNo: true } });
  const nextCaseNo = (maxCase._max.caseNo || 80000) + 1;

  let commPercent: number | null = null;
  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (doctor) commPercent = doctor.commissionPercent;
  }

  let resolvedParentId = data.parentVisitId || null;
  if (resolvedParentId) {
    const parent = await prisma.visit.findUnique({
      where: { id: resolvedParentId },
      select: { parentVisitId: true },
    });
    if (parent?.parentVisitId) {
      resolvedParentId = parent.parentVisitId;
    }
  }

  try {
    const visit = await prisma.visit.create({
      data: {
        caseNo: nextCaseNo,
        patientId: data.patientId,
        visitDate: new Date(data.visitDate),
        visitType: data.visitType,
        parentVisitId: resolvedParentId,
        stepLabel: data.stepLabel || null,
        operationId: data.operationId || null,
        operationRate: rawRate,
        discount: validatedDiscount,
        discountReason: data.discountReason || null,
        quantity: data.quantity || 1,
        doctorId,
        doctorCommissionPercent: commPercent,
        notes: data.notes || null,
      },
    });

    // Audit: flag large discounts (>20%)
    if (rawRate > 0 && validatedDiscount > 0) {
      const discountPercent = (validatedDiscount / rawRate) * 100;
      if (discountPercent > 20) {
        logFlaggedAction({
          action: "LARGE_DISCOUNT",
          actorId: currentUser.id,
          patientId: data.patientId,
          visitId: visit.id,
          entityType: "Visit",
          entityId: visit.id,
          reason: data.discountReason || "No reason provided",
          details: { rate: rawRate, discount: validatedDiscount, discountPercent: Math.round(discountPercent * 10) / 10, discountReason: data.discountReason },
        });
      }
    }

    if (data.appointmentId) {
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { visitId: visit.id, status: "IN_PROGRESS" },
      });
      revalidatePath("/appointments");
    }

    // Link plan item if provided
    if (data.planItemId) {
      await prisma.treatmentPlanItem.update({
        where: { id: data.planItemId },
        data: { visitId: visit.id, completedAt: new Date() },
      });
    }

    revalidatePath("/visits");
    revalidatePath("/dashboard");
    revalidatePath(`/patients/${data.patientId}`);

    return { visitId: visit.id };
  } catch (error) {
    throw new Error(toUserError(error));
  }
}

// --- Create Visit & Examine (doctor fast path) ---

export async function createVisitAndExamine(
  patientId: number,
  appointmentId: number,
  planItemId?: number | null
): Promise<{ visitId: number }> {
  const currentUser = await requireAuth();
  if (!canExamine(currentUser.permissionLevel)) {
    throw new Error("Only doctors can create visits");
  }

  const maxCase = await prisma.visit.aggregate({ _max: { caseNo: true } });
  const nextCaseNo = (maxCase._max.caseNo || 80000) + 1;

  const doctorRecord = await prisma.doctor.findUnique({
    where: { id: currentUser.id },
    select: { commissionPercent: true },
  });

  // Plan-aware: if planItemId provided, fetch plan item for treatment context
  let operationId: number | null = null;
  let operationRate = 0;
  let visitType: "NEW" | "FOLLOWUP" = "NEW";
  let parentVisitId: number | null = null;
  let stepLabel: string | null = null;

  if (planItemId) {
    const planItem = await prisma.treatmentPlanItem.findUnique({
      where: { id: planItemId },
      include: {
        operation: { select: { id: true, defaultMinFee: true } },
        plan: {
          select: {
            items: {
              where: { visitId: { not: null } },
              orderBy: { completedAt: "desc" },
              take: 1,
              select: { visitId: true },
            },
          },
        },
      },
    });

    if (planItem) {
      operationId = planItem.operationId;
      operationRate = planItem.operation?.defaultMinFee || 0;
      stepLabel = planItem.label;

      // Chain to the most recently completed visit in this plan
      const lastCompletedVisitId = planItem.plan.items[0]?.visitId;
      if (lastCompletedVisitId) {
        // Resolve to root parent for flat chain
        const lastVisit = await prisma.visit.findUnique({
          where: { id: lastCompletedVisitId },
          select: { id: true, parentVisitId: true },
        });
        parentVisitId = lastVisit?.parentVisitId || lastVisit?.id || null;
        visitType = "FOLLOWUP";
      }
    }
  }

  try {
    const visit = await prisma.visit.create({
      data: {
        caseNo: nextCaseNo,
        patientId,
        visitDate: new Date(),
        visitType,
        parentVisitId,
        stepLabel,
        operationId,
        operationRate,
        discount: 0,
        doctorId: currentUser.id,
        doctorCommissionPercent: doctorRecord?.commissionPercent ?? null,
      },
    });

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { visitId: visit.id, status: "IN_PROGRESS" },
    });

    // Mark plan item as completed
    if (planItemId) {
      await prisma.treatmentPlanItem.update({
        where: { id: planItemId },
        data: { visitId: visit.id, completedAt: new Date() },
      });
    }

    revalidatePath("/visits");
    revalidatePath("/dashboard");
    revalidatePath("/appointments");
    revalidatePath(`/patients/${patientId}`);

    return { visitId: visit.id };
  } catch (error) {
    throw new Error(toUserError(error));
  }
}
