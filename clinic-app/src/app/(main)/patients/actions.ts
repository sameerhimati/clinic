"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canEditPatients, isAdmin } from "@/lib/permissions";

export async function createPatient(formData: FormData) {
  const currentUser = await requireAuth();
  if (!canEditPatients(currentUser.permissionLevel)) {
    throw new Error("Insufficient permissions");
  }
  const data = {
    salutation: formData.get("salutation") as string || undefined,
    name: formData.get("name") as string,
    fatherHusbandName: formData.get("fatherHusbandName") as string || undefined,
    dateOfBirth: formData.get("dateOfBirth") ? new Date(formData.get("dateOfBirth") as string) : undefined,
    ageAtRegistration: formData.get("ageAtRegistration") ? parseInt(formData.get("ageAtRegistration") as string) : undefined,
    gender: formData.get("gender") as string || undefined,
    bloodGroup: formData.get("bloodGroup") as string || undefined,
    occupation: formData.get("occupation") as string || undefined,
    phone: formData.get("phone") as string || undefined,
    mobile: formData.get("mobile") as string || undefined,
    email: formData.get("email") as string || undefined,
    addressLine1: formData.get("addressLine1") as string || undefined,
    addressLine2: formData.get("addressLine2") as string || undefined,
    addressLine3: formData.get("addressLine3") as string || undefined,
    city: formData.get("city") as string || undefined,
    pincode: formData.get("pincode") as string || undefined,
    referringPhysician: formData.get("referringPhysician") as string || undefined,
    physicianPhone: formData.get("physicianPhone") as string || undefined,
    remarks: formData.get("remarks") as string || undefined,
  };

  if (!data.name) {
    throw new Error("Patient name is required");
  }

  // Auto-generate patient code (next in sequence)
  const maxCode = await prisma.patient.aggregate({ _max: { code: true } });
  const nextCode = (maxCode._max.code || 10000) + 1;

  const patient = await prisma.patient.create({
    data: { ...data, code: nextCode },
  });

  // Handle diseases
  const diseaseIds = formData.getAll("diseases").map(Number).filter(Boolean);
  if (diseaseIds.length > 0) {
    await prisma.patientDisease.createMany({
      data: diseaseIds.map((diseaseId) => ({
        patientId: patient.id,
        diseaseId,
      })),
    });
  }

  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatient(id: number, formData: FormData) {
  const currentUser = await requireAuth();
  if (!canEditPatients(currentUser.permissionLevel)) {
    throw new Error("Insufficient permissions");
  }

  const data = {
    salutation: formData.get("salutation") as string || undefined,
    name: formData.get("name") as string,
    fatherHusbandName: formData.get("fatherHusbandName") as string || undefined,
    dateOfBirth: formData.get("dateOfBirth") ? new Date(formData.get("dateOfBirth") as string) : null,
    ageAtRegistration: formData.get("ageAtRegistration") ? parseInt(formData.get("ageAtRegistration") as string) : null,
    gender: formData.get("gender") as string || undefined,
    bloodGroup: formData.get("bloodGroup") as string || undefined,
    occupation: formData.get("occupation") as string || undefined,
    phone: formData.get("phone") as string || undefined,
    mobile: formData.get("mobile") as string || undefined,
    email: formData.get("email") as string || undefined,
    addressLine1: formData.get("addressLine1") as string || undefined,
    addressLine2: formData.get("addressLine2") as string || undefined,
    addressLine3: formData.get("addressLine3") as string || undefined,
    city: formData.get("city") as string || undefined,
    pincode: formData.get("pincode") as string || undefined,
    referringPhysician: formData.get("referringPhysician") as string || undefined,
    physicianPhone: formData.get("physicianPhone") as string || undefined,
    remarks: formData.get("remarks") as string || undefined,
  };

  if (!data.name) {
    throw new Error("Patient name is required");
  }

  await prisma.patient.update({ where: { id }, data });

  // Update diseases
  const diseaseIds = formData.getAll("diseases").map(Number).filter(Boolean);
  await prisma.patientDisease.deleteMany({ where: { patientId: id } });
  if (diseaseIds.length > 0) {
    await prisma.patientDisease.createMany({
      data: diseaseIds.map((diseaseId) => ({
        patientId: id,
        diseaseId,
      })),
    });
  }

  revalidatePath(`/patients/${id}`);
  revalidatePath("/patients");
  redirect(`/patients/${id}`);
}

export async function updatePatientDiseases(patientId: number, diseaseIds: number[]) {
  const currentUser = await requireAuth();
  if (!canEditPatients(currentUser.permissionLevel)) {
    throw new Error("Insufficient permissions");
  }

  // Validate and deduplicate
  const uniqueIds = [...new Set(diseaseIds)].filter(id => Number.isInteger(id) && id > 0);
  if (uniqueIds.length > 50) throw new Error("Too many diseases");

  await prisma.patientDisease.deleteMany({ where: { patientId } });
  if (uniqueIds.length > 0) {
    await prisma.patientDisease.createMany({
      data: uniqueIds.map((diseaseId) => ({ patientId, diseaseId })),
    });
  }
  revalidatePath(`/patients/${patientId}`);
}

export async function deletePatient(id: number) {
  const currentUser = await requireAuth();
  if (!isAdmin(currentUser.permissionLevel)) {
    throw new Error("Insufficient permissions");
  }

  await prisma.patient.delete({ where: { id } });
  revalidatePath("/patients");
  redirect("/patients");
}
