import { PrismaClient } from '@prisma/client'

/**
 * Exécute une requête Prisma dans le contexte d'un tenant.
 * SET app.tenant_id active les policies RLS automatiquement.
 *
 * @example
 * const users = await withTenantContext(prisma, tenantId, (tx) =>
 *   tx.user.findMany()
 * )
 */
export async function withTenantContext<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (prisma: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
    return fn(tx as unknown as PrismaClient)
  })
}
