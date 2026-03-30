# Kernel Institutionnel Générique — Design Brainstorm
## Processus : Multi-Agent Structured Review

**Date :** 2026-02-28
**Statut :** APPROUVÉ — Prêt pour implémentation
**Arbiter :** Alexandra Dupont, CTO

---

## Résumé exécutif

Ce document est le résultat d'un processus de **brainstorming multi-agent structuré** en 3 phases :

- **Phase 1** : Design initial par Thomas Martin (Architecte) — v0.1
- **Phase 2** : Review séquentielle par 3 agents spécialisés — v0.1 → v0.4
  - Isabelle Chen (Lead Sécurité, CISSP) — 11 objections
  - Mathieu Côté (Lead DevOps) — 8 contraintes
  - Camille Tremblay (Lead Frontend/UX) — 7 objections
- **Phase 3** : Arbitrage par Alexandra Dupont (CTO) — APPROUVÉ

**Total : 26 objections traitées, 19 décisions architecturales, 3 risques résiduels identifiés.**

---

## Objet du design

Un **Kernel Institutionnel Générique** : ensemble de packages NPM privés (`@diofevre/kernel-*`) fournissant les capacités transversales pour les applications institutionnelles Diofevre (LMS, ERP académique, futures apps).

### Contraintes fondamentales
- ✅ **WCAG 2.1 AA** — obligatoire, non-optionnel, enforced techniquement
- ✅ **Audit logs immuables** — hash chain SHA-256, Loi 25 Québec
- ✅ **Multi-tenant** — données isolées entre institutions, RLS PostgreSQL
- ✅ **Multi-platform** — Web (Next.js), Mobile (React Native), Desktop (Electron/Tauri)
- ✅ **Keycloak 26 Organizations** — auth unique, multi-tenant
- ✅ **Zero logique métier** dans le Kernel — uniquement capacités transversales

---

## Architecture finale (v0.4)

### Packages NPM privés

```
@diofevre/kernel-core          — Multi-tenancy, RLS, TenantMiddleware
@diofevre/kernel-auth          — Keycloak JWT, JWKS cache, AuthGuard
@diofevre/kernel-audit         — Hash chain SHA-256, crypto-erasure, S3 WORM
@diofevre/kernel-wcag          — Design tokens, branded types, WCAG primitives
@diofevre/kernel-docs          — Living documentation, OpenAPI auto-generation
@diofevre/kernel-notifications — Email/push/webhook abstraction
@diofevre/kernel-privacy       — Loi 25, crypto-erasure utilities
```

### Multi-Platform Bridge

```
packages/kernel-core          — Pure TypeScript, zero framework deps
packages/kernel-client        — Adapters: HttpAdapter | NativeAdapter | DesktopAdapter
```

---

## Decision Log v0.4 — 19 décisions

### Sécurité (révisions Isabelle Chen, CISSP)

| ID | Décision | Raison |
|---|---|---|
| DL-001 | PgBouncer `server_reset_query` ciblé + `current_tenant_id_safe()` fail-closed | `DISCARD ALL` coûte 2-5ms/reset ; fail-closed si contexte absent |
| DL-002 | RLS `SET LOCAL` + ALS workers + `runWithTenant()` obligatoire + lint rule | `SET` sans `LOCAL` = fuite silencieuse entre connexions poolées |
| DL-003 | TenantMiddleware fail-closed — JWT uniquement, M2M avec `allowedTenants` | Fallback header non authentifié = bypass sécurité trivial |
| DL-004 | WCAG branded types + constructeurs validés + lint `no-direct-brand-cast` | `as AccessibleLabel` contourne les branded types sans constructeur |
| DL-005 | Hash chain + retry 3× + BullMQ rattrapage + 16 partitions `audit_log` | SERIALIZABLE limité à ~150-200 writes/s ; partitionnement → 2400/s |
| DL-006 | Crypto-shredding + révocation IAM immédiate + DPA 7j window documenté | AWS KMS impose 7j min ; révocation IAM immédiate rend données inaccessibles |
| DL-007 | HMAC actorId + table `audit_identity_resolution` séparée (DPO only) | Rotation HMAC sans table de résolution détruit l'auditabilité légale |
| DL-008 | Living docs + golden schema gate CI + `openapi-diff` breaking change | Doc auto-générée sans gate peut diverger silencieusement du code |
| DL-009 | `healthCheck()` contrat complet + `HealthOrchestratorService` + timeout | `healthCheck()` sans timeout peut bloquer le démarrage de l'app hôte |
| DL-010 | JWKS cache TTL 30s + flush d'urgence admin + PDB + JWKS key overlap 5min | Compromission clé Keycloak → tokens signés ancienne clé acceptés pendant TTL |
| DL-011 | ALS workers : `tenantId` explicite dans payload `TenantJobPayload<T>` | ALS ne se propage pas via sérialisation Redis (BullMQ workers) |
| DL-012 | ADR governance : template avec `review_date` (max 18 mois) + cron GitHub Issues | ADR sans mécanisme de re-évaluation deviennent des fossiles institutionnels |

### Opérationnel (révisions Mathieu Côté, DevOps)

| ID | Décision | Impact |
|---|---|---|
| DL-013op | `server_reset_query` ciblé (0.1-0.3ms vs 2-5ms `DISCARD ALL`) | Throughput PgBouncer ×10-50 |
| DL-014op | SLA BullMQ : P99 500ms ; freeze si DLQ > 10k ; notification DPO auto | Comportement déterministe sous contention d'audit |
| **DL-015op** | **Envelope encryption 3 niveaux : 50 CMKs/institutions — coût $52/mois** | **Économie : $5M+/mois → $52/mois (facteur 96 000)** |
| DL-016op | S3 WORM lifecycle : Standard→IA→Glacier IR→Deep Archive ; coût ~$27.5k/fin période | Dérive budgétaire maîtrisée sur 7 ans de rétention |
| DL-017op | `?pgbouncer=true` + `statement_cache_size=0` + `DATABASE_DIRECT_URL` migrations | Prisma prepared statements incompatibles avec PgBouncer mode transaction |
| DL-018op | RPO = 0s (Redis Sentinel + appendfsync always) ; drain DLQ ordonné ; cron hash chain | Hash chain out-of-order = preuve d'audit non opposable (Loi 25) |
| DL-019op | Expand/contract policy (28-90j) ; NX Cloud cache distribué (build ~2-4 min) | Multi-version simultanée en prod sans conflit de schema |
| DL-020op | PDB maxUnavailable=1 ; JWKS key overlap 5min ; cache TTL 30s ; graceful drain 60s | Zero 401 intermittents pendant rolling restart k8s |

### UX (révisions Camille Tremblay, Frontend/UX)

| ID | Décision |
|---|---|
| DL-021ux | `AuthErrorMapper` — aucune chaîne technique exposée aux clients ; mapping `messageKey` i18n |
| DL-022ux | `transaction_id` persistant + `X-Freeze-Context` + `GET /transactions/{id}/status` |
| DL-023ux | `degradedBehavior` dans réponses API + obligation d'affichage frontend (bandeau contextuel) |
| DL-024ux | Effacement Loi 25 → 202 Accepted + 2 emails confirmation + `GET /privacy/erasure-requests/{id}` |
| DL-025ux | Sessions `extended` → refresh JWT silencieux à 80% TTL + grâce 5min + modale gracieuse |
| DL-026ux | `createAccessibleLabel()` unifiée ; matrice tests tripartite (axe-core + TalkBack + VoiceOver) |
| DL-027ux | Golden schema workflow 4 étapes ; drain DLQ conditionné PII ; SLA DPO 4h ouvrées documenté |

---

## Arbitrage CTO — Tensions résiduelles

### Tension A : READ COMMITTED vs SERIALIZABLE sur audit_log
**Décision : READ COMMITTED ACCEPTÉ**
La Loi 25 impose une obligation fonctionnelle de traçabilité, pas un niveau d'isolation de transaction spécifique. Le mécanisme compensatoire (cron de vérification hash chain toutes les 15 minutes + alerte + gel institution) satisfait cette obligation. Le cron est une **obligation non-négociable** — sa défaillance déclenche une alerte critique.

### Tension B : DEKs en cache mémoire 5 minutes
**Décision : ACCEPTÉ — sans décision de board**
Compromis de viabilité produit ($5M/mois → $52/mois). La fenêtre d'exposition de 5 minutes sur les DEKs déchiffrées est un risque réel mais borné (compromission mémoire active uniquement). **Exigence :** Registre des risques de sécurité formel, signé par la CTO, avant mise en production.

### Tension C : Drain DLQ avec SLA DPO 4h ouvrées
**Décision : ACCEPTÉ avec précision requise**
Un événement en DLQ n'est pas une fuite de données. La Loi 25 n'impose pas de délai de quelques heures pour le traitement de files mortes d'audit interne. **Exigence :** Définition contractuelle des heures ouvrées, identité du responsable de garde P1 pour incidents critiques.

---

## Prérequis avant implémentation

Les éléments suivants **bloquent le déploiement en staging ou production** :

| # | Prérequis | Bloque | Responsable |
|---|---|---|---|
| 1 | Validation DPO : hash chain + READ COMMITTED satisfait Loi 25 | Staging | DPO |
| 2 | Validation légale : workflow effacement Loi 25 (fenêtre 7j KMS, SLA DPO 4h) | Staging | Équipe légale |
| 3 | Définition contractuelle heures ouvrées DPO + responsable garde P1 | Staging | DPO |
| 4 | Registre des risques (DEK cache 5min), signé CTO | Production | CISO / CTO |
| 5 | Spike technique Keycloak 26 Organizations : JWKS TTL 30s rate limiting (1j) | Staging | Architecte |
| 6 | Validation PO : seuil freeze DLQ 10k messages (impact business institution) | Staging | Product Owner |
| 7 | Golden schema v1.0 gelé avant implémentation adapters cross-platform | Implémentation | Architecte |

---

## Risques résiduels à monitorer

| Risque | Probabilité | Impact | Signal |
|---|---|---|---|
| **R1 — Dérive silencieuse hash chain** : fenêtre de 15min sans détection | Faible | Élevé | Taux d'échec cron, alertes hash chain, nb institutions gelées |
| **R2 — DEKs orphelines post-crypto-shredding** : présentes dans backups/snapshots | Moyenne | Moyen | Rapport mensuel DEKs orphelines, erreurs déchiffrement applicatif |
| **R3 — Saturation PgBouncer multi-tenant** : pool contention sous charge extrême | Moyenne | Élevé | Temps attente pool (alerte si > 5ms), p99 latence applicative |

> Indicateur de dégradation R1 : plus d'une institution gelée par semaine → bug systémique, pas attaque.
> Seuil d'action R3 : p99 > 200ms en charge normale → revoir stratégie de pooling.

---

## Exit criteria du brainstorming — Checklist

- [x] Understanding Lock complété (Thomas Martin, Phase 1)
- [x] Tous les reviewers invoqués (Isabelle, Mathieu, Camille)
- [x] Toutes les objections traitées ou explicitement rejetées (26/26)
- [x] Decision Log complété (27 décisions v0.4)
- [x] Tensions résiduelles arbitrées (3/3)
- [x] Arbiter a déclaré le design acceptable (Alexandra Dupont, CTO)

**Disposition finale : APPROUVÉ** — Prêt pour implémentation.

---

## Liens vers les documents connexes

- [System Design C4](../inception/05-system-design.md)
- [ADR Foundation](../adr/ADR-001-004-foundation.md)
- [Threat Model STRIDE+DREAD](../inception/03-threat-model.md)
- [ÉFVP / PIA Loi 25](../inception/04-efvp-pia-loi25.md)
- [Project Charter](../inception/01-project-charter.md)

---

*Document généré lors d'une session de multi-agent brainstorming structuré.*
*Auteurs : Thomas Martin (Architecte), Isabelle Chen (Lead Sécurité), Mathieu Côté (DevOps), Camille Tremblay (Frontend/UX), Alexandra Dupont (CTO).*
