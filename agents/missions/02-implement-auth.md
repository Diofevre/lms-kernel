# Mission 02 — AuthGuard Keycloak + Middleware Tenant
# =============================================================================
# Jira    : LMSK-11 (AuthGuard) + LMSK-12 (Middleware tenant)
# Sprint  : Sprint 01 — Foundation
# Branch  : feature/02-auth-middleware  ← créer depuis develop
# Agent   : Cursor Cloud
# Priorité: HIGH — bloqué par Mission 01
#
# PRÉREQUIS OBLIGATOIRES (vérifier avant de commencer) :
#   ✅ PR Mission 01 mergée sur develop
#   ✅ @lms/db package existe dans packages/db/
#   ✅ packages/iam/src/types.ts existe (KernelRole, AuthenticatedUser)
#   ✅ Lire agents/context/CODING_STANDARDS.md
#   ✅ Lire agents/context/SPRINT_01_BACKLOG.md
# =============================================================================

## Sous-tâches Jira

| Sous-tâche | Ticket  | Description                                         |
|------------|---------|-----------------------------------------------------|
| 1          | LMSK-24 | Implémenter validation JWT via JWKS (jose library)  |
| 2          | LMSK-25 | Créer décorateur @Roles(...roles)                   |
| 3          | LMSK-26 | Créer décorateur @Public()                          |
| 4          | LMSK-27 | Écrire 5 tests unitaires (scénarios Gherkin)        |
| 5          | LMSK-28 | Regex extraction subdomain depuis Host header        |
| 6          | LMSK-29 | Lookup tenant en DB par slug                        |
| 7          | LMSK-30 | Injecter tenantSlug et tenantId dans req            |
| 8          | LMSK-31 | Gérer le cas localhost en mode dev                  |

---

## Fichiers à créer (liste exhaustive)

```
apps/api/src/
├── modules/
│   └── auth/
│       ├── auth.guard.ts              ← modifier (existe déjà, améliorer)
│       ├── auth.module.ts             ← nouveau
│       ├── decorators/
│       │   ├── roles.decorator.ts     ← nouveau
│       │   └── public.decorator.ts    ← nouveau
│       └── __tests__/
│           └── auth.guard.spec.ts     ← nouveau (5 tests Gherkin)
└── common/
    └── middleware/
        ├── tenant.middleware.ts       ← modifier (existe déjà, améliorer)
        └── __tests__/
            └── tenant.middleware.spec.ts ← nouveau (4 tests)
```

---

## Sous-tâche 1 — Décorateurs [LMSK-25, LMSK-26]

Créer `apps/api/src/modules/auth/decorators/roles.decorator.ts` :

```typescript
import { SetMetadata } from '@nestjs/common'
import { KernelRole } from '@lms/iam'

export const ROLES_KEY = 'roles'

/**
 * Restreint l'accès à un ou plusieurs rôles Keycloak.
 * @example @Roles(KernelRole.TENANT_ADMIN, KernelRole.SUPER_ADMIN)
 */
export const Roles = (...roles: KernelRole[]) => SetMetadata(ROLES_KEY, roles)
```

Créer `apps/api/src/modules/auth/decorators/public.decorator.ts` :

```typescript
import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Marque une route comme publique — bypass l'AuthGuard.
 * @example @Public() sur les routes /health, /auth/callback
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
```

---

## Sous-tâche 2 — AuthGuard Keycloak [LMSK-24]

Modifier `apps/api/src/modules/auth/auth.guard.ts` :

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { AuthenticatedUser } from '@lms/iam'
import { KernelRole } from '@lms/iam'
import { IS_PUBLIC_KEY } from './decorators/public.decorator'
import { ROLES_KEY } from './decorators/roles.decorator'

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`),
)

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Routes publiques — bypass
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)

    if (!token) {
      throw new UnauthorizedException('Token manquant')
    }

    // 2. Valider le JWT via JWKS Keycloak
    let payload: Record<string, unknown>
    try {
      const { payload: jwtPayload } = await jwtVerify(token, JWKS, {
        issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
        audience: process.env.KEYCLOAK_CLIENT_ID,
      })
      payload = jwtPayload as Record<string, unknown>
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré')
    }

    // 3. Construire AuthenticatedUser et l'injecter dans req
    const realmRoles =
      (payload.realm_access as { roles?: string[] })?.roles ?? []

    const user: AuthenticatedUser = {
      id: payload.sub as string,
      tenantId: request.tenantId ?? '',
      email: payload.email as string,
      role: this.mapKeycloakRole(realmRoles),
      keycloakId: payload.sub as string,
    }
    request.user = user

    // 4. Vérifier les rôles si @Roles() présent
    const requiredRoles = this.reflector.getAllAndOverride<KernelRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!requiredRoles || requiredRoles.length === 0) return true

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Rôle insuffisant')
    }

    return true
  }

  private extractToken(request: { headers: Record<string, string> }): string | null {
    const auth = request.headers['authorization']
    if (!auth?.startsWith('Bearer ')) return null
    return auth.slice(7)
  }

  private mapKeycloakRole(roles: string[]): KernelRole {
    if (roles.includes('super_admin'))   return KernelRole.SUPER_ADMIN
    if (roles.includes('tenant_admin'))  return KernelRole.TENANT_ADMIN
    if (roles.includes('instructor'))    return KernelRole.INSTRUCTOR
    if (roles.includes('auditor'))       return KernelRole.AUDITOR
    return KernelRole.LEARNER
  }
}
```

---

## Sous-tâche 3 — Tests AuthGuard [LMSK-27]

Créer `apps/api/src/modules/auth/__tests__/auth.guard.spec.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '../auth.guard'

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue({}),
  jwtVerify: vi.fn(),
}))

import { jwtVerify } from 'jose'

const makeContext = (headers: Record<string, string> = {}, tenantId = 'tenant-uuid'): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers, tenantId, user: null }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext

describe('AuthGuard [LMSK-11]', () => {
  let guard: AuthGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new AuthGuard(reflector)
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
  })

  it('rejette une requête sans token → 401 [LMSK-24]', async () => {
    const ctx = makeContext({})
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('rejette un token expiré → 401 [LMSK-24]', async () => {
    vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('expired'))
    const ctx = makeContext({ authorization: 'Bearer token.invalide' })
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('rejette un token valide avec rôle insuffisant → 403 [LMSK-25]', async () => {
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: { sub: 'user-id', email: 'test@test.com', realm_access: { roles: ['learner'] } },
    } as never)
    vi.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['TENANT_ADMIN'])
    const ctx = makeContext({ authorization: 'Bearer valid.token' })
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException)
  })

  it('autorise un token valide avec le bon rôle → 200 [LMSK-25]', async () => {
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: { sub: 'admin-id', email: 'admin@test.com', realm_access: { roles: ['tenant_admin'] } },
    } as never)
    vi.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['TENANT_ADMIN'])
    const ctx = makeContext({ authorization: 'Bearer valid.token' })
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
  })

  it('autorise une route @Public() sans token [LMSK-26]', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true)
    const ctx = makeContext({})
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
  })
})
```

---

## Sous-tâche 4 — Middleware Tenant [LMSK-28 à LMSK-31]

Modifier `apps/api/src/common/middleware/tenant.middleware.ts` :

```typescript
import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@lms/db'

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaClient) {}

  async use(req: Request & { tenantSlug?: string; tenantId?: string }, _res: Response, next: NextFunction): Promise<void> {
    const slug = this.extractSlug(req.headers.host ?? '')

    if (!slug) {
      throw new NotFoundException('Tenant introuvable — sous-domaine manquant')
    }

    if (slug === 'dev' && process.env.NODE_ENV !== 'production') {
      req.tenantSlug = 'dev'
      req.tenantId = process.env.DEV_TENANT_ID ?? 'dev-tenant-id'
      return next()
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, deletedAt: null },
      select: { id: true, slug: true, isActive: true },
    })

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException(`Tenant "${slug}" introuvable ou inactif`)
    }

    req.tenantSlug = tenant.slug
    req.tenantId = tenant.id
    next()
  }

  private extractSlug(host: string): string | null {
    const hostname = host.split(':')[0]
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'dev'
    const parts = hostname.split('.')
    if (parts.length < 3) return null
    return parts[0]
  }
}
```

---

## Sous-tâche 5 — Tests Middleware [LMSK-28 à LMSK-31]

Créer `apps/api/src/common/middleware/__tests__/tenant.middleware.spec.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import { TenantMiddleware } from '../tenant.middleware'

const mockPrisma = { tenant: { findUnique: vi.fn() } }
const mockRes = {}
const mockNext = vi.fn()

describe('TenantMiddleware [LMSK-12]', () => {
  let middleware: TenantMiddleware

  beforeEach(() => {
    middleware = new TenantMiddleware(mockPrisma as never)
    vi.clearAllMocks()
  })

  it('extrait le slug depuis le sous-domaine [LMSK-28, LMSK-29, LMSK-30]', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: 'uuid-1', slug: 'org', isActive: true })
    const req = { headers: { host: 'org.lms.example.com' }, tenantSlug: undefined, tenantId: undefined }
    await middleware.use(req as never, mockRes as never, mockNext)
    expect(req.tenantSlug).toBe('org')
    expect(req.tenantId).toBe('uuid-1')
    expect(mockNext).toHaveBeenCalled()
  })

  it('gère localhost comme mode dev [LMSK-31]', async () => {
    process.env.NODE_ENV = 'development'
    const req = { headers: { host: 'localhost:3000' }, tenantSlug: undefined, tenantId: undefined }
    await middleware.use(req as never, mockRes as never, mockNext)
    expect(req.tenantSlug).toBe('dev')
  })

  it('lève 404 si tenant inconnu [LMSK-29]', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValueOnce(null)
    const req = { headers: { host: 'unknown.lms.example.com' } }
    await expect(middleware.use(req as never, mockRes as never, mockNext)).rejects.toThrow(NotFoundException)
  })

  it('lève 404 si pas de sous-domaine [LMSK-28]', async () => {
    const req = { headers: { host: 'lms.example.com' } }
    await expect(middleware.use(req as never, mockRes as never, mockNext)).rejects.toThrow(NotFoundException)
  })
})
```

---

## Mise à jour CHANGELOG.md

Ajouter dans `[Unreleased]` :

```markdown
### Added
- AuthGuard Keycloak : validation JWT via JWKS, @Roles() et @Public() [LMSK-11]
- Middleware tenant : extraction subdomain + lookup DB + injection req.tenantId [LMSK-12]
- Tests : 5 scénarios AuthGuard + 4 scénarios Middleware [LMSK-27, LMSK-31]
```

---

## Critères de validation avant PR

```
✅ auth.guard.ts : 5 tests passent
✅ tenant.middleware.ts : 4 tests passent
✅ Couverture >= 80%
✅ Décorateurs @Roles() et @Public() fonctionnels
✅ localhost → mode dev fonctionnel
✅ Aucun console.log
✅ Aucun any TypeScript
✅ CHANGELOG.md mis à jour
✅ Titre PR contient [LMSK-11, LMSK-12]
```
