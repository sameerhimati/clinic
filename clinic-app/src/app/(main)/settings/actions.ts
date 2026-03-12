"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { canManageRates } from "@/lib/permissions";

export async function updateDefaultAdvance(amount: number) {
  const currentUser = await requireAuth();
  if (!canManageRates(currentUser.permissionLevel, currentUser.isSuperUser)) {
    throw new Error("Unauthorized");
  }
  if (amount < 0 || isNaN(amount)) throw new Error("Invalid amount");

  const existing = await prisma.clinicSettings.findFirst();
  if (existing) {
    await prisma.clinicSettings.update({
      where: { id: existing.id },
      data: { defaultAdvance: amount },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
