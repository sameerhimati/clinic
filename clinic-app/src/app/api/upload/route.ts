import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const currentUser = await requireAuth();

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const patientId = parseInt(formData.get("patientId") as string);
  const visitId = formData.get("visitId")
    ? parseInt(formData.get("visitId") as string)
    : null;
  const description = (formData.get("description") as string) || null;

  if (!file || !patientId) {
    return NextResponse.json(
      { error: "Missing file or patientId" },
      { status: 400 }
    );
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use JPG, PNG, GIF, WebP, or PDF." },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Max 10MB." },
      { status: 400 }
    );
  }

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "patients",
    String(patientId)
  );
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name);
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueName = `${Date.now()}-${safeName}`;
  const filePath = path.join(uploadDir, uniqueName);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const fileType = file.type.startsWith("image/")
    ? ext.replace(".", "")
    : "pdf";

  const patientFile = await prisma.patientFile.create({
    data: {
      patientId,
      visitId,
      filePath: `/uploads/patients/${patientId}/${uniqueName}`,
      fileName: file.name,
      description,
      fileType,
      uploadedById: currentUser.id,
    },
  });

  return NextResponse.json({ success: true, file: patientFile });
}
