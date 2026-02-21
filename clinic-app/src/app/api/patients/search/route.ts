import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentDoctor } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ patients: [] }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 1) return NextResponse.json({ patients: [] });

  const isNumeric = /^\d+$/.test(q);

  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        ...(isNumeric ? [{ code: parseInt(q) }] : []),
        { name: { contains: q } },
        { mobile: { contains: q } },
        { phone: { contains: q } },
      ],
    },
    take: 8,
    orderBy: isNumeric ? { code: "asc" } : { name: "asc" },
    select: {
      id: true,
      code: true,
      salutation: true,
      name: true,
      mobile: true,
      gender: true,
      dateOfBirth: true,
      ageAtRegistration: true,
      createdAt: true,
      visits: {
        orderBy: { visitDate: "desc" },
        take: 1,
        select: { visitDate: true },
      },
    },
  });

  // If numeric and exact match found, put it first
  if (isNumeric) {
    const exactCode = parseInt(q);
    patients.sort((a, b) => {
      if (a.code === exactCode) return -1;
      if (b.code === exactCode) return 1;
      return 0;
    });
  }

  return NextResponse.json({ patients });
}
