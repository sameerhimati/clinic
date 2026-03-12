import { prisma } from "@/lib/db";

export async function getDefaultAdvance(): Promise<number> {
  const settings = await prisma.clinicSettings.findFirst();
  return settings?.defaultAdvance ?? 500;
}
