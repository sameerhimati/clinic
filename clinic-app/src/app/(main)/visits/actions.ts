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

  if (!patientId) throw new Error("Patient is required");

  // Auto-generate case number
  const maxCase = await prisma.visit.aggregate({ _max: { legacyCaseNo: true } });
  const nextCaseNo = (maxCase._max.legacyCaseNo || 80000) + 1;

  // Get doctor commission percent
  let commPercent: number | null = null;
  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (doctor) commPercent = doctor.commissionPercent;
  }

  const visit = await prisma.visit.create({
    data: {
      legacyCaseNo: nextCaseNo,
      patientId,
      visitDate: formData.get("visitDate") ? new Date(formData.get("visitDate") as string) : new Date(),
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
  redirect(`/visits/${visit.id}`);
}
