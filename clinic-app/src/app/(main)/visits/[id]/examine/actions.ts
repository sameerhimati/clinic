"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveExamination(
  visitId: number,
  data: {
    doctorId: number;
    reportDate: string;
    complaint: string | null;
    examination: string | null;
    diagnosis: string | null;
    treatmentNotes: string | null;
    estimate: string | null;
    medication: string | null;
  }
) {
  // Check if a report already exists for this visit
  const existing = await prisma.clinicalReport.findFirst({
    where: { visitId },
  });

  if (existing) {
    await prisma.clinicalReport.update({
      where: { id: existing.id },
      data: {
        doctorId: data.doctorId,
        reportDate: new Date(data.reportDate),
        complaint: data.complaint || null,
        examination: data.examination || null,
        diagnosis: data.diagnosis || null,
        treatmentNotes: data.treatmentNotes || null,
        estimate: data.estimate || null,
        medication: data.medication || null,
      },
    });
  } else {
    await prisma.clinicalReport.create({
      data: {
        visitId,
        doctorId: data.doctorId,
        reportDate: new Date(data.reportDate),
        complaint: data.complaint || null,
        examination: data.examination || null,
        diagnosis: data.diagnosis || null,
        treatmentNotes: data.treatmentNotes || null,
        estimate: data.estimate || null,
        medication: data.medication || null,
      },
    });
  }

  revalidatePath(`/visits/${visitId}`);
  revalidatePath(`/visits/${visitId}/examine`);
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { patientId: true },
  });
  if (visit) revalidatePath(`/patients/${visit.patientId}`);
  revalidatePath("/dashboard");
}

export async function saveAndRedirect(visitId: number, target: "detail" | "print") {
  if (target === "print") {
    redirect(`/visits/${visitId}/examine/print`);
  } else {
    redirect(`/visits/${visitId}`);
  }
}
