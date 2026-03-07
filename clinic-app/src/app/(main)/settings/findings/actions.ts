"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";

async function checkAccess() {
  const currentUser = await requireAuth();
  const isFullAdmin = canManageSystem(currentUser.permissionLevel);
  const isL3Super = currentUser.permissionLevel === 3 && currentUser.isSuperUser;
  if (!isFullAdmin && !isL3Super) {
    throw new Error("Unauthorized");
  }
  return currentUser;
}

export async function createFinding(formData: FormData) {
  await checkAccess();

  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const color = (formData.get("color") as string) || null;

  if (!name?.trim()) throw new Error("Name is required");

  await prisma.toothFinding.create({
    data: {
      name: name.trim(),
      category: category?.trim() || null,
      color,
      sortOrder: 0,
    },
  });

  revalidatePath("/settings/findings");
}

export async function updateFinding(formData: FormData) {
  await checkAccess();

  const id = parseInt(formData.get("id") as string);
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const color = (formData.get("color") as string) || null;

  if (!id || !name?.trim()) throw new Error("Invalid data");

  await prisma.toothFinding.update({
    where: { id },
    data: {
      name: name.trim(),
      category: category?.trim() || null,
      color,
    },
  });

  revalidatePath("/settings/findings");
}

export async function toggleFindingActive(formData: FormData) {
  await checkAccess();

  const id = parseInt(formData.get("id") as string);
  if (!id) throw new Error("Invalid ID");

  const finding = await prisma.toothFinding.findUnique({ where: { id } });
  if (!finding) throw new Error("Finding not found");

  await prisma.toothFinding.update({
    where: { id },
    data: { isActive: !finding.isActive },
  });

  revalidatePath("/settings/findings");
}
