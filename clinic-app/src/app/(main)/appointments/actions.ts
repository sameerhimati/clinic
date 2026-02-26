"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getAllowedNextStatuses } from "@/lib/appointment-status";
import { appointmentSchema, parseFormData } from "@/lib/validations";

export async function createAppointment(formData: FormData) {
  const currentUser = await requireAuth();
  const parsed = parseFormData(appointmentSchema, formData);

  // Validate date is today or future
  const appointmentDate = new Date(parsed.date);
  appointmentDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (appointmentDate < today) throw new Error("Cannot schedule appointments in the past");

  // L3 doctors can only create appointments for themselves
  const doctorId = currentUser.permissionLevel === 3
    ? currentUser.id
    : (parsed.doctorId || null);

  await prisma.appointment.create({
    data: {
      patientId: parsed.patientId,
      doctorId: doctorId || null,
      roomId: parsed.roomId || null,
      date: appointmentDate,
      timeSlot: parsed.timeSlot,
      reason: parsed.reason,
      notes: parsed.notes,
      createdById: currentUser.id,
    },
  });

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  redirect(`/appointments?date=${parsed.date}`);
}

export async function updateAppointmentStatus(
  appointmentId: number,
  newStatus: string,
  cancelReason?: string
) {
  await requireAuth();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) throw new Error("Appointment not found");

  const allowed = getAllowedNextStatuses(appointment.status);
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${appointment.status} to ${newStatus}`);
  }

  if (newStatus === "CANCELLED" && !cancelReason) {
    throw new Error("Cancel reason is required");
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: newStatus,
      cancelReason: newStatus === "CANCELLED" ? cancelReason : undefined,
    },
  });

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
}

export async function updateAppointment(appointmentId: number, formData: FormData) {
  const currentUser = await requireAuth();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) throw new Error("Appointment not found");
  if (appointment.status !== "SCHEDULED") throw new Error("Can only edit scheduled appointments");

  const dateStr = formData.get("date") as string;
  if (!dateStr) throw new Error("Date is required");

  // Validate date is today or future
  const updateDate = new Date(dateStr);
  updateDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (updateDate < today) throw new Error("Cannot reschedule appointments to the past");

  // L3 doctors can only assign appointments to themselves
  const doctorId = currentUser.permissionLevel === 3
    ? currentUser.id
    : (formData.get("doctorId") ? parseInt(formData.get("doctorId") as string) : null);
  const roomId = formData.get("roomId") ? parseInt(formData.get("roomId") as string) : null;
  const timeSlot = (formData.get("timeSlot") as string) || null;
  const reason = (formData.get("reason") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      date: new Date(dateStr),
      doctorId: doctorId || null,
      roomId: roomId || null,
      timeSlot,
      reason,
      notes,
    },
  });

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
}

export async function claimAppointment(appointmentId: number) {
  const currentUser = await requireAuth();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) throw new Error("Appointment not found");
  if (appointment.doctorId) throw new Error("Appointment already assigned to a doctor");
  if (appointment.status !== "ARRIVED") throw new Error("Can only claim arrived appointments");

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { doctorId: currentUser.id },
  });

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
}

export async function deleteAppointment(appointmentId: number) {
  const currentUser = await requireAuth();
  if (!isAdmin(currentUser.permissionLevel)) throw new Error("Admin only");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) throw new Error("Appointment not found");
  if (!["CANCELLED", "NO_SHOW"].includes(appointment.status)) {
    throw new Error("Can only delete cancelled or no-show appointments");
  }

  await prisma.appointment.delete({ where: { id: appointmentId } });

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
}
