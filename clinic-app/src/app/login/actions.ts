"use server";

import { prisma } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const doctorId = parseInt(formData.get("doctorId") as string);
  const password = formData.get("password") as string;

  if (!doctorId || !password) {
    return { error: "Please select a user and enter a password" };
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
  });

  if (!doctor || !doctor.password || doctor.password !== password) {
    return { error: "Invalid credentials" };
  }

  await setSession(doctor.id);
  redirect("/dashboard");
}
