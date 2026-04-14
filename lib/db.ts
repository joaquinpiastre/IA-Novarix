import { PrismaClient } from "@prisma/client";

/** Cliente Prisma singleton. Política multi-tenant: ver comentarios en prisma/schema.prisma y docs/DATABASE.md */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
