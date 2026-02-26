import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentDoctor } from "@/lib/auth";
import { todayString } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  const doctor = await getCurrentDoctor();
  if (!doctor || doctor.permissionLevel > 2) {
    return NextResponse.json({ arrived: 0, inProgress: 0 });
  }

  const today = todayString();
  const todayDate = new Date(today);
  const tomorrowDate = new Date(todayDate.getTime() + 86400000);

  const [arrived, inProgress] = await Promise.all([
    prisma.appointment.count({
      where: {
        date: { gte: todayDate, lt: tomorrowDate },
        status: "ARRIVED",
      },
    }),
    prisma.appointment.count({
      where: {
        date: { gte: todayDate, lt: tomorrowDate },
        status: "IN_PROGRESS",
      },
    }),
  ]);

  return NextResponse.json({ arrived, inProgress });
}
