"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
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
      ...(parsed.password ? { password: parsed.password } : {}),
    },
  });

  revalidatePath("/doctors");
  redirect(`/doctors`);
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
