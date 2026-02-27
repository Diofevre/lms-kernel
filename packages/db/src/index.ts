export { prisma } from './client'
export { withTenantContext } from './tenant-context'
export { PrismaClient, Prisma } from '@prisma/client'
export type {
  Tenant,
  User,
  Consent,
  AuditLog,
  UserRole,
  ConsentPurpose,
} from '@prisma/client'
