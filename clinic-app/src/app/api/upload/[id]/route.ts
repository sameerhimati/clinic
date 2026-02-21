import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel > 2) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const file = await prisma.patientFile.findUnique({
    where: { id: parseInt(id) },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await unlink(path.join(process.cwd(), "public", file.filePath));
  } catch {
    // File might already be gone
  }

  await prisma.patientFile.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
