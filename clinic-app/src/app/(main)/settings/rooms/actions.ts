"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createRoom(formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Room name is required");

  const sortOrder = formData.get("sortOrder")
    ? parseInt(formData.get("sortOrder") as string)
    : 0;

  await prisma.room.create({
    data: { name, sortOrder },
  });

  revalidatePath("/settings/rooms");
}

export async function toggleRoomActive(formData: FormData) {
  await requireAdmin();

  const id = parseInt(formData.get("id") as string);
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) return;

  await prisma.room.update({
    where: { id },
    data: { isActive: !room.isActive },
  });

  revalidatePath("/settings/rooms");
}
