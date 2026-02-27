# Changelog

Toutes les modifications notables sont documentées ici.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
Versioning : [Semantic Versioning](https://semver.org/lang/fr/)

> Ce fichier est mis à jour automatiquement par la CI (Stage 5) à chaque release.
> Les agents doivent ajouter une entrée dans `[Unreleased]` à chaque PR.

---

## [Unreleased]

### Added
- `@lms/db` package : schéma Prisma (Tenant, User, Consent, AuditLog) [LMSK-9]
- Row Level Security (RLS) sur toutes les tables tenant-scoped [LMSK-10]
- Helper `withTenantContext()` pour isolation automatique par tenant [LMSK-22]
- Soft delete sur Tenant et User (champ `deletedAt`) [LMSK-14, LMSK-15]
- Conformité Loi 25 : Consent model avec ConsentPurpose enum [LMSK-16]
- AuditLog append-only avec policies RLS RESTRICTIVE + chaîne hash SHA-256 [LMSK-17]
- DatabaseModule NestJS (`@Global`) exposant le singleton Prisma
- Structure initiale du monorepo (NestJS API + Next.js Web + packages)
- Pipeline CI/CD 7 stages (pre-commit → canary production)
- Packages kernel : `@lms/core`, `@lms/audit`, `@lms/compliance`, `@lms/iam`
- Devcontainer GitHub Codespaces (PostgreSQL + Redis + Keycloak auto-start)
- Branch protections : `main`, `develop`, `staging`
- GitHub Environments : development, test, staging, production
- Documentation : ADRs, sprints, coding standards, agent missions
- Conformité : Loi 25 gate, WCAG 2.1 AA gate dans CI

### Security
- Gitleaks : détection de secrets à chaque commit et PR
- SAST : CodeQL + Semgrep dans Stage 2
- DAST : OWASP ZAP dans Stage 3
- Audit log immuable avec SHA-256 hash chain

---

## [0.1.0] — 2026-02-26

- Initialisation du projet LMS Kernel
