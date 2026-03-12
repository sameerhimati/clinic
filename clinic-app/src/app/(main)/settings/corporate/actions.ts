"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { canManageRates } from "@/lib/permissions";

export async function createCorporatePartner(name: string, notes?: string) {
  const currentUser = await requireAuth();
  if (!canManageRates(currentUser.permissionLevel, currentUser.isSuperUser)) {
    throw new Error("Unauthorized");
  }
  if (!name.trim()) throw new Error("Name is required");

  await prisma.corporatePartner.create({
    data: { name: name.trim(), notes: notes?.trim() || null },
  });

  revalidatePath("/settings/corporate");
}

export async function toggleCorporatePartner(id: number) {
  const currentUser = await requireAuth();
  if (!canManageRates(currentUser.permissionLevel, currentUser.isSuperUser)) {
    throw new Error("Unauthorized");
  }

  const partner = await prisma.corporatePartner.findUnique({ where: { id } });
  if (!partner) throw new Error("Partner not found");

  await prisma.corporatePartner.update({
    where: { id },
    data: { isActive: !partner.isActive },
  });

  revalidatePath("/settings/corporate");
}
