import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton PrismaClient instance.
 *
 * Uses globalThis to avoid creating multiple connections during
 * Next.js hot-reload in development. In production, a single
 * instance is created and reused.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Sets the tenant context for Row Level Security.
 * Must be called before any tenant-scoped query.
 */
export async function setTenantContext(
  client: PrismaClient,
  tenantId: string,
): Promise<void> {
  await client.$executeRawUnsafe(
    `SET app.tenant_id = '${tenantId}'`,
  );
}

export { PrismaClient };
export type * from "@prisma/client";
