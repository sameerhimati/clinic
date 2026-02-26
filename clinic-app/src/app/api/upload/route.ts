import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, FILE_TYPE_ERROR, FILE_SIZE_ERROR } from "@/lib/file-constants";

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

  if (!(ALLOWED_FILE_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: FILE_TYPE_ERROR }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: FILE_SIZE_ERROR }, { status: 400 });
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
