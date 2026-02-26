"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { toUserError } from "@/lib/action-utils";
import { visitSchema, parseFormData } from "@/lib/validations";

export async function createVisit(formData: FormData) {
  const currentUser = await requireAuth();
  const isDoctor = currentUser.permissionLevel === 3;
  const parsed = parseFormData(visitSchema, formData);

  if (!parsed.patientId) throw new Error("Patient is required");

  // Server-side enforcement: doctors can only set themselves, and cannot control financial/lab fields
  const doctorId = isDoctor ? currentUser.id : (parsed.doctorId || null);
  const assistingDoctorId = isDoctor ? null : (parsed.assistingDoctorId || null);
  const labId = isDoctor ? null : (parsed.labId || null);
  const labRateId = isDoctor ? null : (parsed.labRateId || null);

  // Server-side discount validation — enforce tier limits by role
  const rawDiscount = isDoctor ? 0 : parsed.discount;
  const rawRate = isDoctor
    ? (parsed.operationId ? (await prisma.operation.findUnique({ where: { id: parsed.operationId }, select: { defaultMinFee: true } }))?.defaultMinFee || 0 : 0)
    : parsed.operationRate;

  let validatedDiscount = rawDiscount;
  if (!isDoctor && rawRate > 0 && rawDiscount > 0) {
    const discountPercent = (rawDiscount / rawRate) * 100;
    const maxPercent = currentUser.permissionLevel >= 3 ? 10 : currentUser.permissionLevel >= 2 ? 15 : 100;
    if (discountPercent > maxPercent + 0.5) {
      throw new Error(`Discount exceeds your authorized limit (${maxPercent}%)`);
    }
    validatedDiscount = Math.min(rawDiscount, rawRate);
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
        assistingDoctorId: assistingDoctorId || null,
        doctorCommissionPercent: commPercent,
        labId,
        labRateId,
        labRateAmount: isDoctor ? 0 : parsed.labRateAmount,
        labQuantity: isDoctor ? 1 : parsed.labQuantity,
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
  } catch (error) {
    throw new Error(toUserError(error));
  }

  revalidatePath("/visits");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${parsed.patientId}`);
  redirect(`/visits/${visitId}?newVisit=1`);
}
