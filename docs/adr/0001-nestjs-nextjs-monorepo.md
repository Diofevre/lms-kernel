# ADR 0001 — NestJS + Next.js Monorepo

**Date** : 2026-02-26
**Statut** : ✅ Accepté
**Décideurs** : Équipe kernel

## Contexte

Le LMS Kernel doit servir plusieurs types de clients :
- Application web (browser)
- Application desktop (futur)
- Application mobile (futur)
- Agents IA qui consomment des APIs

La plateforme doit être modulaire, institutionnelle, et supportable à long terme.

## Décision

Adopter un monorepo **pnpm workspaces + Turborepo** avec :
- `apps/api/` — NestJS (backend API platform-agnostic)
- `apps/web/` — Next.js App Router (frontend web)
- `packages/*` — packages partagés (core, audit, compliance, iam)
- `modules/*` — modules LMS pluggables

## Raisons

1. **NestJS** est le standard enterprise Node.js : DI natif, guards, interceptors, modules déclaratifs — proche d'Angular/Spring Boot
2. **Platform-agnostic** : NestJS sert du REST/GraphQL à n'importe quel client (web, mobile, desktop)
3. **Monorepo** : un seul repo = CI/CD unifié, partage de types, refactoring cross-packages facilité
4. **Turborepo** : build incrémental, cache partagé = CI rapide même avec beaucoup de packages
5. **Séparation backend/frontend** : les agents peuvent travailler sur l'API et le web en parallèle sans conflits

## Alternatives considérées

- **Next.js full-stack** : plus simple mais Next.js API Routes trop limitées pour une architecture enterprise (pas de guards, pas d'interceptors natifs, pas de DI)
- **NestJS seul (sans Next.js)** : frontend à construire séparément, plus de coordination nécessaire
- **Fastify direct** : trop bas niveau pour du code institutionnel maintenable

## Conséquences

- Deux serveurs à déployer (API + Web) — complexité opérationnelle légèrement plus élevée
- Les agents doivent comprendre la séparation backend/frontend
- Chaque module LMS a une partie API (NestJS) et optionnellement une partie UI (Next.js)
