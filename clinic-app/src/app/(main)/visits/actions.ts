"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { toUserError } from "@/lib/action-utils";
import { visitSchema, parseFormData } from "@/lib/validations";

export async function createVisit(formData: FormData) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel !== 3) {
    throw new Error("Only doctors can create visits");
  }
  const parsed = parseFormData(visitSchema, formData);

  if (!parsed.patientId) throw new Error("Patient is required");

  // Doctor auto-assignment
  const doctorId = currentUser.id;

  // Rate: always use tariff for doctors
  const rawRate = parsed.operationId
    ? (await prisma.operation.findUnique({ where: { id: parsed.operationId }, select: { defaultMinFee: true } }))?.defaultMinFee || 0
    : 0;

  // Discount validation — doctors can give up to 10%
  let validatedDiscount = parsed.discount;
  if (rawRate > 0 && validatedDiscount > 0) {
    const discountPercent = (validatedDiscount / rawRate) * 100;
    const maxPercent = 10; // Doctors capped at 10%
    if (discountPercent > maxPercent + 0.5) {
      throw new Error(`Discount exceeds your authorized limit (${maxPercent}%)`);
    }
    validatedDiscount = Math.min(validatedDiscount, rawRate);
  }

  // Auto-generate case number
  const maxCase = await prisma.visit.aggregate({ _max: { caseNo: true } });
  const nextCaseNo = (maxCase._max.caseNo || 80000) + 1;

  // Get doctor commission percent
  let commPercent: number | null = null;
  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (doctor) commPercent = doctor.commissionPercent;
  }

  // For follow-ups, resolve to root parent (flat chain)
  let resolvedParentId = parsed.parentVisitId || null;
  if (resolvedParentId) {
    const parent = await prisma.visit.findUnique({
      where: { id: resolvedParentId },
      select: { parentVisitId: true },
    });
    if (parent?.parentVisitId) {
      resolvedParentId = parent.parentVisitId;
    }
  }

  let visitId: number;
  try {
    const visit = await prisma.visit.create({
      data: {
        caseNo: nextCaseNo,
        patientId: parsed.patientId,
        visitDate: parsed.visitDate,
        visitType: parsed.visitType,
        parentVisitId: resolvedParentId,
        stepLabel: parsed.stepLabel,
        operationId: parsed.operationId,
        operationRate: rawRate,
        discount: validatedDiscount,
        doctorId,
        doctorCommissionPercent: commPercent,
        notes: parsed.notes,
      },
    });
    visitId = visit.id;

    // Link appointment if provided
    if (parsed.appointmentId) {
      await prisma.appointment.update({
        where: { id: parsed.appointmentId },
        data: { visitId: visit.id, status: "IN_PROGRESS" },
      });
      revalidatePath("/appointments");
    }

    // Link plan item if provided (from search params)
    if (parsed.planItemId) {
      await prisma.treatmentPlanItem.update({
        where: { id: parsed.planItemId },
        data: { visitId: visit.id, completedAt: new Date() },
      });
    }
  } catch (error) {
    throw new Error(toUserError(error));
  }

  revalidatePath("/visits");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${parsed.patientId}`);
  redirect(`/visits/${visitId}?newVisit=1`);
}

// --- Quick Visit (returns visitId instead of redirecting) ---

type QuickVisitInput = {
  patientId: number;
  operationId?: number;
  operationRate: number;
  discount: number;
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
};

export async function createQuickVisit(data: QuickVisitInput): Promise<{ visitId: number }> {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel !== 3) {
    throw new Error("Only doctors can create visits");
  }

  if (!data.patientId) throw new Error("Patient is required");

  const doctorId = currentUser.id;

  // Rate: always use tariff
  const rawRate = data.operationId
    ? (await prisma.operation.findUnique({ where: { id: data.operationId }, select: { defaultMinFee: true } }))?.defaultMinFee || 0
    : 0;

  // Discount validation — doctors can give up to 10%
  let validatedDiscount = data.discount;
  if (rawRate > 0 && validatedDiscount > 0) {
    const discountPercent = (validatedDiscount / rawRate) * 100;
    const maxPercent = 10;
    if (discountPercent > maxPercent + 0.5) {
      throw new Error(`Discount exceeds your authorized limit (${maxPercent}%)`);
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
        doctorId,
        doctorCommissionPercent: commPercent,
        notes: data.notes || null,
      },
    });

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
  appointmentId: number
): Promise<{ visitId: number }> {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel !== 3) {
    throw new Error("Only doctors can create visits");
  }

  const maxCase = await prisma.visit.aggregate({ _max: { caseNo: true } });
  const nextCaseNo = (maxCase._max.caseNo || 80000) + 1;

  const doctorRecord = await prisma.doctor.findUnique({
    where: { id: currentUser.id },
    select: { commissionPercent: true },
  });

  try {
    const visit = await prisma.visit.create({
      data: {
        caseNo: nextCaseNo,
        patientId,
        visitDate: new Date(),
        visitType: "NEW",
        operationRate: 0,
        discount: 0,
        doctorId: currentUser.id,
        doctorCommissionPercent: doctorRecord?.commissionPercent ?? null,
      },
    });

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { visitId: visit.id, status: "IN_PROGRESS" },
    });

    revalidatePath("/visits");
    revalidatePath("/dashboard");
    revalidatePath("/appointments");
    revalidatePath(`/patients/${patientId}`);

    return { visitId: visit.id };
  } catch (error) {
    throw new Error(toUserError(error));
  }
}
