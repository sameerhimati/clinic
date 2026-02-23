"use server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const doctor = await requireAuth();
  if (!canManageSystem(doctor.permissionLevel)) {
    redirect("/dashboard");
  }
  return doctor;
}

export async function createDoctor(formData: FormData) {
  await requireAdmin();

  const maxCode = await prisma.doctor.aggregate({ _max: { code: true } });
  const nextCode = (maxCode._max.code || 0) + 1;

  const doctor = await prisma.doctor.create({
    data: {
      code: nextCode,
      name: (formData.get("name") as string).trim(),
      mobile: (formData.get("mobile") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      designationId: formData.get("designationId") ? parseInt(formData.get("designationId") as string) : null,
      permissionLevel: parseInt(formData.get("permissionLevel") as string) || 3,
      commissionPercent: parseFloat(formData.get("commissionPercent") as string) || 0,
      commissionRate: formData.get("commissionRate") ? parseFloat(formData.get("commissionRate") as string) || null : null,
      tdsPercent: parseFloat(formData.get("tdsPercent") as string) || 0,
      password: (formData.get("password") as string)?.trim() || null,
      isActive: true,
    },
  });

  revalidatePath("/doctors");
  redirect(`/doctors`);
}

export async function updateDoctor(formData: FormData) {
  await requireAdmin();

  const id = parseInt(formData.get("id") as string);

  await prisma.doctor.update({
    where: { id },
    data: {
      name: (formData.get("name") as string).trim(),
      mobile: (formData.get("mobile") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      designationId: formData.get("designationId") ? parseInt(formData.get("designationId") as string) : null,
      permissionLevel: parseInt(formData.get("permissionLevel") as string) || 3,
      commissionPercent: parseFloat(formData.get("commissionPercent") as string) || 0,
      commissionRate: formData.get("commissionRate") ? parseFloat(formData.get("commissionRate") as string) || null : null,
      tdsPercent: parseFloat(formData.get("tdsPercent") as string) || 0,
      ...(((formData.get("password") as string)?.trim()) ? { password: (formData.get("password") as string).trim() } : {}),
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
