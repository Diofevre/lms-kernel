# Changelog

Toutes les modifications notables sont documentées ici.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
Versioning : [Semantic Versioning](https://semver.org/lang/fr/)

> Ce fichier est mis à jour automatiquement par la CI (Stage 5) à chaque release.
> Les agents doivent ajouter une entrée dans `[Unreleased]` à chaque PR.

---

## [Unreleased]

### Added
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
