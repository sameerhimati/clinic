"use server";

import { prisma } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { doctorSchema, parseFormData } from "@/lib/validations";

export async function createDoctor(formData: FormData) {
  await requireAdmin();
  const parsed = parseFormData(doctorSchema, formData);

  const maxCode = await prisma.doctor.aggregate({ _max: { code: true } });
  const nextCode = (maxCode._max.code || 0) + 1;

  await prisma.doctor.create({
    data: {
      code: nextCode,
      name: parsed.name,
      mobile: parsed.mobile,
      email: parsed.email,
      designationId: parsed.designationId,
      permissionLevel: parsed.permissionLevel,
      commissionPercent: parsed.commissionPercent,
      commissionRate: parsed.commissionRate,
      tdsPercent: parsed.tdsPercent,
      isConsultant: parsed.isConsultant,
      password: parsed.password,
      isActive: true,
    },
  });

  revalidatePath("/doctors");
  redirect(`/doctors`);
}

export async function updateDoctor(formData: FormData) {
  await requireAdmin();

  const id = parseInt(formData.get("id") as string);
  if (!id || isNaN(id)) throw new Error("Doctor ID is required");

  const parsed = parseFormData(doctorSchema, formData);

  await prisma.doctor.update({
    where: { id },
    data: {
      name: parsed.name,
      mobile: parsed.mobile,
      email: parsed.email,
      designationId: parsed.designationId,
      permissionLevel: parsed.permissionLevel,
      commissionPercent: parsed.commissionPercent,
      commissionRate: parsed.commissionRate,
      tdsPercent: parsed.tdsPercent,
      isConsultant: parsed.isConsultant,
      ...(parsed.password ? { password: parsed.password } : {}),
    },
  });

  revalidatePath("/doctors");
  redirect(`/doctors`);
}

export async function saveAvailability(
  doctorId: number,
  slots: { dayOfWeek: number; startTime: string; endTime: string }[]
) {
  // Admin/reception can edit any doctor's schedule; doctors can edit their own
  const currentUser = await requireAuth();
  const isOwnSchedule = currentUser.id === doctorId;
  if (currentUser.permissionLevel > 2 && !isOwnSchedule) {
    throw new Error("Not authorized");
  }

  // Delete all existing, then recreate (same pattern as saveTreatmentSteps)
  await prisma.doctorAvailability.deleteMany({ where: { doctorId } });

  if (slots.length > 0) {
    await prisma.doctorAvailability.createMany({
      data: slots.map((s) => ({
        doctorId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });
  }

  revalidatePath(`/doctors/${doctorId}/edit`);
}

export async function toggleDoctorActive(formData: FormData) {
  await requireAdmin();

  const id = parseInt(formData.get("id") as string);
  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) return;

  await prisma.doctor.update({
    where: { id },
    data: { isActive: !doctor.isActive },
  });

  revalidatePath("/doctors");
}
