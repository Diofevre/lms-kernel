import { prisma } from "./client.js";
import type { PrismaClient } from "../generated/prisma/index.js";

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Execute a function within a tenant-scoped transaction.
 * Sets PostgreSQL session variable for RLS policies.
 * The tenantId MUST come from a validated JWT, never from client input.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
