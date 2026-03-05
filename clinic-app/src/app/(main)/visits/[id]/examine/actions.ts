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
    teethSelected?: string | null;
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
        teethSelected: data.teethSelected || null,
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
        teethSelected: data.teethSelected || null,
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

export async function assignTreatmentToVisit(
  visitId: number,
  operationId: number
) {
  const currentUser = await requireAuth();
  if (!canExamine(currentUser.permissionLevel)) {
    throw new Error("Only doctors can assign treatments");
  }

  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
    select: { id: true, name: true, defaultMinFee: true, doctorFee: true },
  });
  if (!operation) throw new Error("Operation not found");

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      operationId: operation.id,
      operationRate: operation.defaultMinFee || 0,
      discount: 0,
    },
  });

  revalidateVisitPaths(visitId);
  return { operationName: operation.name, operationRate: operation.defaultMinFee || 0 };
}

type ConsultationSchedule = {
  operationId: number;
  doctorId: number;
  date: string;
  timeSlot: string;
};

export async function createPlansFromConsultation(
  patientId: number,
  visitId: number,
  doctorId: number,
  operationIds: number[],
  schedules?: ConsultationSchedule[]
) {
  const currentUser = await requireAuth();
  if (!canExamine(currentUser.permissionLevel)) {
    throw new Error("Only doctors can create treatment plans");
  }

  if (operationIds.length === 0) return { count: 0, scheduledCount: 0 };

  // Idempotency guard: if plans already linked to this visit, skip
  const existingPlanItem = await prisma.treatmentPlanItem.findFirst({
    where: { visitId },
  });
  if (existingPlanItem) {
    return { count: 0, scheduledCount: 0, alreadyExisted: true };
  }

  const operations = await prisma.operation.findMany({
    where: { id: { in: operationIds } },
    select: { id: true, name: true },
  });

  let count = 0;
  let scheduledCount = 0;
  for (const op of operations) {
    const templateSteps = await prisma.treatmentStep.findMany({
      where: { operationId: op.id },
      orderBy: { stepNumber: "asc" },
      select: { name: true, defaultDayGap: true, description: true },
    });

    const items = templateSteps.length > 0
      ? templateSteps.map((step, index) => ({
          sortOrder: index + 1,
          label: step.name,
          operationId: op.id,
          assignedDoctorId: doctorId,
          estimatedDayGap: step.defaultDayGap,
          notes: step.description,
          // First step is linked to this visit as completed
          ...(index === 0
            ? { visitId, completedAt: new Date() }
            : {}),
        }))
      : [{
          sortOrder: 1,
          label: op.name,
          operationId: op.id,
          assignedDoctorId: doctorId,
          estimatedDayGap: 7,
          notes: null as string | null,
          visitId,
          completedAt: new Date(),
        }];

    const plan = await prisma.treatmentPlan.create({
      data: {
        patientId,
        title: op.name,
        createdById: currentUser.id,
        items: { create: items },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    count++;

    // Create appointment for next step if schedule provided
    const schedule = schedules?.find((s) => s.operationId === op.id);
    if (schedule) {
      // Find the first incomplete item (step 2 for multi-step, none for single-step)
      const nextItem = plan.items.find((i) => !i.completedAt);
      if (nextItem) {
        await prisma.appointment.create({
          data: {
            patientId,
            doctorId: schedule.doctorId,
            date: new Date(schedule.date),
            timeSlot: schedule.timeSlot,
            reason: `${op.name} — ${nextItem.label}`,
            planItemId: nextItem.id,
            status: "SCHEDULED",
            createdById: currentUser.id,
          },
        });
        scheduledCount++;
      }
    }
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/appointments");
  return { count, scheduledCount };
}

export async function getNextArrivedAppointment(doctorId: number) {
  await requireAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const next = await prisma.appointment.findFirst({
    where: {
      doctorId,
      status: "ARRIVED",
      date: { gte: today, lt: tomorrow },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, patientId: true },
  });

  return next;
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
