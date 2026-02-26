"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { toUserError } from "@/lib/action-utils";

export async function createVisit(formData: FormData) {
  const currentUser = await requireAuth();
  const isDoctor = currentUser.permissionLevel === 3;
  const patientId = parseInt(formData.get("patientId") as string);
  const operationId = formData.get("operationId") ? parseInt(formData.get("operationId") as string) : null;

  // Server-side enforcement: doctors can only set themselves, and cannot control financial/lab fields
  const doctorId = isDoctor ? currentUser.id : (formData.get("doctorId") ? parseInt(formData.get("doctorId") as string) : null);
  const assistingDoctorId = isDoctor ? null : (formData.get("assistingDoctorId") ? parseInt(formData.get("assistingDoctorId") as string) : null);
  const labId = isDoctor ? null : (formData.get("labId") ? parseInt(formData.get("labId") as string) : null);
  const labRateId = isDoctor ? null : (formData.get("labRateId") ? parseInt(formData.get("labRateId") as string) : null);
  const visitType = (formData.get("visitType") as string) || "NEW";
  const parentVisitId = formData.get("parentVisitId") ? parseInt(formData.get("parentVisitId") as string) : null;

  if (!patientId) throw new Error("Patient is required");

  // Server-side discount validation — enforce tier limits by role
  const rawDiscount = isDoctor ? 0 : (parseFloat(formData.get("discount") as string) || 0);
  const rawRate = isDoctor
    ? (operationId ? (await prisma.operation.findUnique({ where: { id: operationId }, select: { defaultMinFee: true } }))?.defaultMinFee || 0 : 0)
    : (parseFloat(formData.get("operationRate") as string) || 0);

  let validatedDiscount = rawDiscount;
  if (!isDoctor && rawRate > 0 && rawDiscount > 0) {
    const discountPercent = (rawDiscount / rawRate) * 100;
    // L3 (doctor): max 10%, L2 (reception): max 15%, L0/L1 (admin): unlimited
    const maxPercent = currentUser.permissionLevel >= 3 ? 10 : currentUser.permissionLevel >= 2 ? 15 : 100;
    if (discountPercent > maxPercent + 0.5) { // 0.5% tolerance for rounding
      throw new Error(`Discount exceeds your authorized limit (${maxPercent}%)`);
    }
    validatedDiscount = Math.min(rawDiscount, rawRate); // Can't exceed rate
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
  let resolvedParentId = parentVisitId;
  if (resolvedParentId) {
    const parent = await prisma.visit.findUnique({
      where: { id: resolvedParentId },
      select: { parentVisitId: true },
    });
    if (parent?.parentVisitId) {
      resolvedParentId = parent.parentVisitId;
    }
  }

  const stepLabel = (formData.get("stepLabel") as string) || null;
  const appointmentId = formData.get("appointmentId") ? parseInt(formData.get("appointmentId") as string) : null;

  let visitId: number;
  try {
    const visit = await prisma.visit.create({
      data: {
        caseNo: nextCaseNo,
        patientId,
        visitDate: formData.get("visitDate") ? new Date(formData.get("visitDate") as string) : new Date(),
        visitType,
        parentVisitId: resolvedParentId,
        stepLabel,
        operationId,
        operationRate: rawRate,
        discount: validatedDiscount,
        doctorId,
        assistingDoctorId: assistingDoctorId || null,
        doctorCommissionPercent: commPercent,
        labId,
        labRateId,
        labRateAmount: isDoctor ? 0 : (parseFloat(formData.get("labRateAmount") as string) || 0),
        labQuantity: isDoctor ? 1 : (parseFloat(formData.get("labQuantity") as string) || 1),
        notes: (formData.get("notes") as string) || null,
      },
    });
    visitId = visit.id;

    // Link appointment if provided
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { visitId: visit.id, status: "IN_PROGRESS" },
      });
      revalidatePath("/appointments");
    }
  } catch (error) {
    throw new Error(toUserError(error));
  }

  revalidatePath("/visits");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/visits/${visitId}?newVisit=1`);
}
