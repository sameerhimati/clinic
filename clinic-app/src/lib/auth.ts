import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "session";

export async function getCurrentDoctor() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie?.value) return null;

  const doctorId = parseInt(sessionCookie.value);
  if (isNaN(doctorId)) return null;

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      id: true,
      name: true,
      code: true,
      permissionLevel: true,
      designationId: true,
    },
  });

  return doctor;
}

export async function requireAuth() {
  const doctor = await getCurrentDoctor();
  if (!doctor) redirect("/login");
  return doctor;
}

export async function setSession(doctorId: number) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, String(doctorId), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Require auth + admin (canManageSystem) permission, redirect to dashboard otherwise */
export async function requireAdmin() {
  const { canManageSystem } = await import("@/lib/permissions");
  const doctor = await requireAuth();
  if (!canManageSystem(doctor.permissionLevel)) redirect("/dashboard");
  return doctor;
}
