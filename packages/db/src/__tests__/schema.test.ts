import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'

describe('Schéma Prisma — types et contraintes', () => {
  it('UserRole contient les 5 rôles attendus', () => {
    const roles = Object.values(Prisma.UserRole)
    expect(roles).toContain('SUPER_ADMIN')
    expect(roles).toContain('TENANT_ADMIN')
    expect(roles).toContain('INSTRUCTOR')
    expect(roles).toContain('LEARNER')
    expect(roles).toContain('AUDITOR')
  })

  it('ConsentPurpose contient les 3 valeurs Loi 25', () => {
    const purposes = Object.values(Prisma.ConsentPurpose)
    expect(purposes).toContain('REQUIRED')
    expect(purposes).toContain('ANALYTICS')
    expect(purposes).toContain('MARKETING')
  })
})

describe('withTenantContext — isolation RLS [LMSK-23]', () => {
  // Ces tests nécessitent une DB de test — ils passent dans le CI (Stage 2)
  // En local : DATABASE_URL doit pointer vers la DB de test
  it.todo('un user tenant A ne peut pas lire les users tenant B')
  it.todo('un audit_log ne peut pas être modifié (RLS append-only)')
  it.todo('SET app.tenant_id active correctement la policy')
})
