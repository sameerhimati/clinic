import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

// Enable foreign key enforcement for SQLite
if (!globalForPrisma.prisma) {
  prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON").catch(() => {
    // Silently ignore if not on SQLite (Postgres enforces FKs by default)
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
