/**
 * @prinodia/database
 *
 * Prisma client singleton for Prinodia Workspace.
 * Re-exports the Prisma client and all generated types.
 */

import { PrismaClient } from "@prisma/client";

// Prevent multiple Prisma Client instances in development (Next.js hot-reload)
declare global {
  // eslint-disable-next-line no-var
  var __govsphere_prisma: PrismaClient | undefined;
}

const createPrismaClient = () =>
  new PrismaClient({
    log: process.env["NODE_ENV"] === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "pretty",
  });

export const prisma: PrismaClient = globalThis.__govsphere_prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__govsphere_prisma = prisma;
}

// Re-export Prisma types
export * from "@prisma/client";

export default prisma;
