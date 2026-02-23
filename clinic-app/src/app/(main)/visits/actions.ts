"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createVisit(formData: FormData) {
  const patientId = parseInt(formData.get("patientId") as string);
  const operationId = formData.get("operationId") ? parseInt(formData.get("operationId") as string) : null;
  const doctorId = formData.get("doctorId") ? parseInt(formData.get("doctorId") as string) : null;
  const assistingDoctorId = formData.get("assistingDoctorId") ? parseInt(formData.get("assistingDoctorId") as string) : null;
  const labId = formData.get("labId") ? parseInt(formData.get("labId") as string) : null;
  const labRateId = formData.get("labRateId") ? parseInt(formData.get("labRateId") as string) : null;
  const visitType = (formData.get("visitType") as string) || "NEW";
  const parentVisitId = formData.get("parentVisitId") ? parseInt(formData.get("parentVisitId") as string) : null;

  if (!patientId) throw new Error("Patient is required");

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

  const visit = await prisma.visit.create({
    data: {
      caseNo: nextCaseNo,
      patientId,
      visitDate: formData.get("visitDate") ? new Date(formData.get("visitDate") as string) : new Date(),
      visitType,
      parentVisitId: resolvedParentId,
      stepLabel,
      operationId,
      operationRate: parseFloat(formData.get("operationRate") as string) || 0,
      discount: parseFloat(formData.get("discount") as string) || 0,
      doctorId,
      assistingDoctorId: assistingDoctorId || null,
      doctorCommissionPercent: commPercent,
      labId,
      labRateId,
      labRateAmount: parseFloat(formData.get("labRateAmount") as string) || 0,
      labQuantity: parseFloat(formData.get("labQuantity") as string) || 1,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath("/visits");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/visits/${visit.id}?newVisit=1`);
}
