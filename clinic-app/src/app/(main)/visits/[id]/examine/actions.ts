"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { isReportLocked, isAdmin, canExamine } from "@/lib/permissions";

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
  const currentUser = await requireAuth();
  if (!canExamine(currentUser.permissionLevel)) {
    throw new Error("Only doctors can create or edit clinical reports");
  }

  // Check if a report already exists for this visit
  const existing = await prisma.clinicalReport.findFirst({
    where: { visitId },
  });

  if (existing) {
    // Check lock state
    if (isReportLocked(existing) && !isAdmin(currentUser.permissionLevel)) {
      throw new Error("Report is locked and cannot be edited");
    }

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

  // Auto-complete linked appointment
  let appointmentAutoCompleted = false;
  let completedAppointmentId: number | null = null;

  const visitWithAppts = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { appointments: { where: { status: "IN_PROGRESS" }, take: 1 } },
  });
  if (visitWithAppts?.appointments[0]) {
    await prisma.appointment.update({
      where: { id: visitWithAppts.appointments[0].id },
      data: { status: "COMPLETED" },
    });
    appointmentAutoCompleted = true;
    completedAppointmentId = visitWithAppts.appointments[0].id;
    revalidatePath("/appointments");
  }

  revalidateVisitPaths(visitId);
  return { appointmentAutoCompleted, completedAppointmentId };
}

export async function finalizeReport(reportId: number) {
  const currentUser = await requireAuth();
  if (!canExamine(currentUser.permissionLevel)) {
    throw new Error("Only doctors can finalize reports");
  }

  const report = await prisma.clinicalReport.findUnique({
    where: { id: reportId },
  });
  if (!report) throw new Error("Report not found");

  await prisma.clinicalReport.update({
    where: { id: reportId },
    data: {
      lockedAt: new Date(),
      lockedById: currentUser.id,
    },
  });

  revalidateVisitPaths(report.visitId);
}

export async function unlockReport(reportId: number) {
  const currentUser = await requireAuth();
  if (!isAdmin(currentUser.permissionLevel)) {
    throw new Error("Only admins can unlock reports");
  }

  const report = await prisma.clinicalReport.findUnique({
    where: { id: reportId },
  });
  if (!report) throw new Error("Report not found");

  await prisma.clinicalReport.update({
    where: { id: reportId },
    data: {
      lockedAt: null,
      lockedById: null,
    },
  });

  revalidateVisitPaths(report.visitId);
}

export async function addAddendum(reportId: number, content: string) {
  const currentUser = await requireAuth();
  if (!canExamine(currentUser.permissionLevel)) {
    throw new Error("Only doctors can add addendums");
  }

  const report = await prisma.clinicalReport.findUnique({
    where: { id: reportId },
  });
  if (!report) throw new Error("Report not found");
  if (!content.trim()) throw new Error("Addendum content is required");

  await prisma.clinicalAddendum.create({
    data: {
      clinicalReportId: reportId,
      doctorId: currentUser.id,
      content: content.trim(),
    },
  });

  revalidateVisitPaths(report.visitId);
}

export async function saveQuickNote(visitId: number, content: string) {
  const currentUser = await requireAuth();
  if (!canExamine(currentUser.permissionLevel)) {
    throw new Error("Only doctors can add clinical notes");
  }
  if (!content.trim()) throw new Error("Note content is required");

  const existing = await prisma.clinicalReport.findFirst({
    where: { visitId },
  });

  if (existing) {
    if (isReportLocked(existing)) {
      // Locked — create addendum instead
      await prisma.clinicalAddendum.create({
        data: {
          clinicalReportId: existing.id,
          doctorId: currentUser.id,
          content: content.trim(),
        },
      });
    } else {
      // Unlocked — append to treatmentNotes
      const existingNotes = existing.treatmentNotes || "";
      const newNotes = existingNotes
        ? `${existingNotes}\n\n${content.trim()}`
        : content.trim();
      await prisma.clinicalReport.update({
        where: { id: existing.id },
        data: { treatmentNotes: newNotes },
      });
    }
  } else {
    // Create new report with just treatmentNotes
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { doctorId: true },
    });
    await prisma.clinicalReport.create({
      data: {
        visitId,
        doctorId: visit?.doctorId || currentUser.id,
        reportDate: new Date(),
        treatmentNotes: content.trim(),
      },
    });
  }

  revalidateVisitPaths(visitId);
}

export async function saveAndRedirect(visitId: number, target: "detail" | "print") {
  if (target === "print") {
    redirect(`/visits/${visitId}/examine/print`);
  } else {
    redirect(`/visits/${visitId}`);
  }
}

async function revalidateVisitPaths(visitId: number) {
  revalidatePath(`/visits/${visitId}`);
  revalidatePath(`/visits/${visitId}/examine`);
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { patientId: true },
  });
  if (visit) revalidatePath(`/patients/${visit.patientId}`);
  revalidatePath("/dashboard");
}
