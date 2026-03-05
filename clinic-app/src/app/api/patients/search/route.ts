import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentDoctor } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ patients: [] }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 1) return NextResponse.json({ patients: [] });

  const isNumeric = /^\d+$/.test(q);
  const likePattern = `%${q}%`;

  // Use raw SQL for case-insensitive search (SQLite LIKE is case-insensitive for ASCII)
  type PatientRow = {
    id: number;
    code: number | null;
    salutation: string | null;
    name: string;
    mobile: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    ageAtRegistration: number | null;
    createdAt: string;
  };

  let rows: PatientRow[];
  if (isNumeric) {
    rows = await prisma.$queryRaw<PatientRow[]>`
      SELECT id, code, salutation, name, mobile, gender, dateOfBirth, ageAtRegistration, createdAt
      FROM patients
      WHERE code = ${parseInt(q)} OR name LIKE ${likePattern} OR mobile LIKE ${likePattern} OR phone LIKE ${likePattern}
      ORDER BY code ASC
      LIMIT 8
    `;
  } else {
    rows = await prisma.$queryRaw<PatientRow[]>`
      SELECT id, code, salutation, name, mobile, gender, dateOfBirth, ageAtRegistration, createdAt
      FROM patients
      WHERE name LIKE ${likePattern} OR mobile LIKE ${likePattern} OR phone LIKE ${likePattern}
      ORDER BY name ASC
      LIMIT 8
    `;
  }

  // Fetch latest visit date for each patient
  const patients = await Promise.all(
    rows.map(async (p) => {
      const visit = await prisma.visit.findFirst({
        where: { patientId: p.id },
        orderBy: { visitDate: "desc" },
        select: { visitDate: true },
      });
      return {
        ...p,
        visits: visit ? [{ visitDate: visit.visitDate }] : [],
      };
    })
  );

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
