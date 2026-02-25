# Mission 02 — Implement Keycloak Auth (full integration)

**Branch**: `feature/02-keycloak-auth`
**Estimated complexity**: High
**Prerequisites**: Mission 01 completed and merged

---

## Objective

Complete the Keycloak authentication integration in `apps/api/` and `apps/web/`.

## What already exists

- `apps/api/src/modules/auth/auth.guard.ts` — JWT validation skeleton
- `packages/iam/src/types.ts` — `KeycloakTokenPayload`, `AuthenticatedUser`, `KernelRole`

## Tasks

### 1. API — Complete AuthGuard

File: `apps/api/src/modules/auth/auth.guard.ts`

- Replace JWKS URL construction with a proper config service
- Add token revocation check (Keycloak introspection endpoint)
- Add `@CurrentUser()` param decorator for controllers
- Write unit tests (mock Keycloak JWKS)

### 2. API — Keycloak admin service

Create: `apps/api/src/modules/auth/keycloak-admin.service.ts`
- Create users in Keycloak realm
- Assign roles (mapped from `KernelRole`)
- Suspend/delete users
- Each action must be logged to AuditLog

### 3. Web — NextAuth v5 with Keycloak provider

File: `apps/web/src/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    }),
  ],
  // Add tenant_id to session from token claims
});
```

### 4. Web — Protected layout

Create: `apps/web/src/app/(protected)/layout.tsx`
- Redirect to login if no session
- Inject tenant context into children

## Compliance requirements

- [ ] Login attempts logged to AuditLog (`auth.login`, `auth.login_failed`)
- [ ] Logout logged (`auth.logout`)
- [ ] Password changes logged (`auth.password_changed`)
- [ ] MFA state changes logged
- [ ] Token contains `tenant_id` claim (configure Keycloak mapper)

## Tests required

- [ ] Auth guard rejects missing token (401)
- [ ] Auth guard rejects expired token (401)
- [ ] Auth guard rejects wrong audience (401)
- [ ] Role check blocks unauthorized roles (403)
- [ ] Successful auth logs to AuditLog
- [ ] E2E: login flow works end-to-end
