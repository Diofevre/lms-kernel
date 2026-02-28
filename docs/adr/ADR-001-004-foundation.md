# Architecture Decision Records (ADR) — LMS Kernel
> Version 1.0 | Date: 2026-02-28 | Auteur: Thomas Martin, Architecte Principal
> Révisé par: Alexandra Dupont (CTO), Isabelle Chen (Lead Sécurité)

---

## ADR-001 : Framework Backend — NestJS + Fastify vs Express vs Hono

**Identifiant :** ADR-001
**Date :** 2026-02-10
**Statut :** Accepté
**Décideurs :** Thomas Martin (Architecte Principal), Alexandra Dupont (CTO), Équipe Backend

---

### Contexte

LMS Kernel nécessite un framework backend TypeScript capable de supporter une architecture multi-tenant complexe avec injection de dépendances, middleware chainable, guards et interceptors. La cible de performance est 1 000 req/s soutenu avec p95 < 200ms. Le système doit être maintenable par une équipe de 6 développeurs sur un horizon de 3 ans minimum.

Le choix du framework impacte directement :
- La vitesse de développement des 12 modules planifiés
- La testabilité unitaire et d'intégration
- La performance brute (req/s, latence)
- L'écosystème de bibliothèques disponibles
- La courbe d'apprentissage pour les nouvelles recrues

**Décision requise avant :** Démarrage Sprint 01 (2026-02-26)

---

### Options Évaluées

#### Option A : NestJS 10 + Fastify

**Description :** NestJS est un framework opinionné basé sur les décorateurs TypeScript (inspiré d'Angular). Il fournit nativement l'injection de dépendances (IoC container), les modules, les pipes de validation, les guards, les interceptors et les filtres d'exceptions. Fastify remplace Express comme transport HTTP pour la performance.

**Forces :**
- IoC container mature, DI testable via `@nestjs/testing`
- Modules avec encapsulation stricte → bounded contexts naturels
- Guards + Interceptors + Filters : pipeline de requête structuré
- Décorateurs : `@Controller`, `@Get`, `@Roles`, `@CurrentUser` → code lisible
- `@nestjs/swagger` : OpenAPI auto-généré depuis les DTOs
- `@nestjs/bull` : intégration BullMQ first-party
- Grande communauté (>60k GitHub stars), NPM downloads stable
- Fastify 4x : 75 000 req/s (benchmarks fastify.dev)
- Support natif TypeScript strict

**Faiblesses :**
- Courbe d'apprentissage initiale (décorateurs, DI, modules)
- Overhead du framework (~5ms de latence vs raw HTTP) — acceptable pour nos cibles
- Bundle size plus important que Hono
- Magic via réflexion TypeScript peut surprendre les nouveaux développeurs

#### Option B : Express 4 + Framework maison

**Description :** Express est le framework Node.js le plus utilisé. API minimaliste (middleware functions), grande flexibilité, écosystème immense. Nécessite de construire soi-même l'architecture (DI, modules, validation).

**Forces :**
- Extrêmement connu (0 courbe d'apprentissage)
- Flexibilité maximale
- Écosystème de middleware vaste

**Faiblesses :**
- Pas de DI native → singletons et imports directs → code difficile à tester
- Architecture libre → risque de divergence entre développeurs
- Performance inférieure à Fastify (~35 000 req/s vs ~75 000)
- Maintenance end-of-life approchante (Express 5 en bêta depuis 4 ans)
- Construire DI + modules + validation de zéro = 3-4 sprints de travail
- TypeScript non-first-class (types `@types/express` souvent incomplets)

#### Option C : Hono + Architecture manuelle

**Description :** Hono est un framework ultra-léger (< 12KB) pensé pour les edge runtimes (Cloudflare Workers, Deno Deploy). API inspirée d'Express mais avec TypeScript first-class et performance maximale.

**Forces :**
- Performance brute maximale (proche de raw HTTP)
- TypeScript natif, inférence de types sur les routes
- Ultra-léger, startup time minimal (utile pour Lambda@Edge)
- API moderne, middleware typé

**Faiblesses :**
- Pas de DI container → même problème qu'Express pour la testabilité
- Pas de concept de modules → architecture à construire
- Écosystème jeune, moins de bibliothèques intégrées
- Optimisé pour edge/serverless — surdimensionné pour Fargate/Fastify
- Communauté plus petite, risque de support long terme
- `@hono/nestjs` n'existe pas : intégrations tierces immatures

---

### Décision

**NestJS 10 avec adaptateur Fastify 4.x**

---

### Justification avec Critères Pondérés

| Critère | Poids | NestJS + Fastify | Express | Hono |
|---|---|---|---|---|
| Architecture & DI | 25% | 10/10 | 4/10 | 3/10 |
| Performance (req/s, latence) | 20% | 8/10 | 5/10 | 10/10 |
| Maintenabilité long terme | 20% | 9/10 | 5/10 | 6/10 |
| Testabilité (unitaire + intégration) | 15% | 10/10 | 4/10 | 4/10 |
| Écosystème & intégrations | 10% | 9/10 | 10/10 | 5/10 |
| Courbe d'apprentissage (onboarding) | 10% | 7/10 | 9/10 | 7/10 |
| **Score pondéré total** | **100%** | **8.95/10** | **5.65/10** | **5.95/10** |

**Analyse des critères déterminants :**

- **Architecture & DI (poids le plus élevé)** : LMS Kernel compte 12 modules avec interdépendances complexes (ex: Enrollment dépend de Course, Assessment, User). Le DI container de NestJS permet d'injecter des mocks précis dans les tests unitaires, de scoper les providers par request (nécessaire pour le TenantContext), et d'encapsuler les modules via `forFeature()`. Express et Hono ne fournissent rien de tel nativement.

- **Performance** : Fastify (75k req/s synthétique) est 2x plus rapide qu'Express (35k req/s). Hono est légèrement supérieur sur benchmarks purs, mais la différence est non-significative sur Fargate avec des accès PostgreSQL/Redis (goulots d'étranglement réels). NestJS + Fastify satisfait largement la cible 1 000 req/s.

- **Testabilité** : `@nestjs/testing` permet de créer des modules de test complets avec override de providers. C'est critique pour atteindre la couverture 80% obligatoire dans le CI.

- **Pipeline de requête** : Le pipeline `Middleware → Guard → Interceptor → Controller → Filter` de NestJS correspond exactement à notre pipeline `TenantMiddleware → ThrottlerGuard → AuthGuard → AuditInterceptor → Controller → HttpExceptionFilter`. Reproduire cela avec Express nécessiterait plusieurs sprints.

---

### Conséquences

**Positives :**
- Pipeline de requête multi-tenant implémentable en < 1 sprint
- Tests unitaires de chaque composant en isolation sans refactoring
- OpenAPI Swagger auto-généré depuis DTOs avec `@nestjs/swagger`
- Intégration BullMQ, Redis, Prisma via modules NestJS officiels
- Onboarding facilité par la documentation NestJS exhaustive

**Négatives et mitigations :**
- **Courbe d'apprentissage décorateurs** : Workshop NestJS obligatoire pour les nouvelles recrues (2h). Documentation interne des patterns utilisés dans `/docs/patterns/`.
- **Overhead décorateurs en dev** : Vérifier que `emitDecoratorMetadata: true` et `experimentalDecorators: true` sont dans `tsconfig.json`. Utiliser SWC pour la compilation (5x plus rapide que `tsc`).
- **Debugging DI** : Logger le graphe de dépendances en cas de `Nest can't resolve dependencies`. Pas de problème insurmontable mais déroutant pour les débutants.

**Impact sprint en cours (Sprint 01) :**
- LMSK-11 (AuthGuard) et LMSK-12 (TenantMiddleware) bénéficient directement de l'architecture Guards/Middleware de NestJS.

---

### Plan d'Implémentation

| Étape | Sprint | Responsable | Livrable |
|---|---|---|---|
| Setup NestJS + Fastify + SWC | Sprint 01 | Lead Backend | `packages/api` buildable |
| TenantMiddleware | Sprint 01 | Backend Dev | LMSK-12 |
| AuthGuard JWKS | Sprint 01 | Backend Dev | LMSK-11 |
| AuditInterceptor | Sprint 01 | Backend Dev | `@lms/audit` package |
| HttpExceptionFilter | Sprint 01 | Backend Dev | Global error handling |
| Module Course (exemple complet) | Sprint 02 | Équipe | Patron pour les autres modules |

---

## ADR-002 : Stratégie d'Isolation Multi-Tenant — PostgreSQL + RLS vs Schéma-par-Tenant vs Base-par-Tenant

**Identifiant :** ADR-002
**Date :** 2026-02-10
**Statut :** Accepté
**Décideurs :** Thomas Martin (Architecte Principal), Alexandra Dupont (CTO), Équipe Data

---

### Contexte

LMS Kernel est une plateforme multi-tenant SaaS. L'isolation des données entre tenants est une exigence de sécurité critique : une faille d'isolation constituerait une violation de la Loi 25 et une catastrophe commerciale. Parallèlement, la solution doit être opérationnellement viable pour une équipe réduite (pas de DBA dédié initialement).

**Paramètres clés :**
- Cible : 100 tenants au lancement, 1 000 tenants à 3 ans
- Données : cours, inscriptions, évaluations, audit logs, consentements
- Équipe ops : 2 DevOps en partage, pas de DBA dédié
- Conformité : Loi 25 — isolation stricte des données personnelles

---

### Options Évaluées

#### Option A : PostgreSQL Shared Database + Row Level Security (RLS)

**Description :** Un seul schéma `public` partagé entre tous les tenants. Chaque table possède une colonne `tenant_id`. PostgreSQL Row Level Security intercepte toutes les requêtes SQL et filtre automatiquement les rows selon `current_setting('app.current_tenant_id')`. L'application positionne ce paramètre de session via `SET LOCAL` ou `set_config()` avant chaque transaction.

**Architecture :**
```
1 base de données → 1 schéma public → N tables avec tenant_id
RLS Policy: USING (tenant_id = current_tenant_id())
Application: SET LOCAL app.current_tenant_id = 'uuid' par transaction
```

**Forces :**
- 1 seul cluster RDS → coût opérationnel minimal
- Migrations appliquées une seule fois (pas de N migrations parallèles)
- Prisma supporte nativement (withTenantContext + set_config)
- PostgreSQL RLS est mature, testé à grande échelle (GitLab utilise RLS)
- Monitoring unifié : 1 jeu de métriques CloudWatch
- Backup/restore simple : 1 base
- Ajout d'un tenant : INSERT dans la table `tenants` uniquement

**Faiblesses :**
- Isolation "soft" : dépend de la bonne configuration du paramètre de session
- Bug dans `withTenantContext()` pourrait exposer des données cross-tenant
- Performance : index sur `tenant_id` obligatoires sur toutes les tables
- Requêtes analytics complexes doivent toujours filtrer par tenant_id

**Mitigations :**
- `FORCE ROW LEVEL SECURITY` sur toutes les tables → même le superuser est filtré
- Rôle applicatif `lms_app_role` sans bypass RLS
- Tests d'isolation automatisés dans le CI (vérifier qu'un tenant A ne voit pas les données du tenant B)
- `RESTRICTIVE` policies → combinées en AND, pas en OR

#### Option B : Schéma PostgreSQL par Tenant

**Description :** Un schéma PostgreSQL dédié par tenant (`schema_org1`, `schema_org2`, etc.). Même structure de tables dans chaque schéma. `search_path` positionné par tenant.

**Architecture :**
```
1 base de données → N schémas (1 par tenant)
Application: SET search_path = schema_{slug}
```

**Forces :**
- Isolation au niveau PostgreSQL (search_path) sans RLS
- Facilite les exports de données par tenant (pg_dump sur un schéma)
- Pas de colonne tenant_id dans les tables (queries plus simples)

**Faiblesses :**
- 100 tenants = 100 schémas × 20 tables = 2 000 objects PostgreSQL → pg_catalog chargé
- Migration : chaque migration doit être appliquée N fois → complexité outillage
- Prisma supporte mal les multi-schemas dynamiques (workarounds fragiles)
- 1 000 tenants à 3 ans : 20 000 tables → performance du plan optimizer dégradée
- `SET search_path` est vulnérable au search_path hijacking si mal configuré
- Onboarding d'un tenant : créer schéma + appliquer toutes les migrations

#### Option C : Base de Données par Tenant

**Description :** Chaque tenant possède sa propre base de données PostgreSQL (ou instance RDS). Isolation maximale.

**Architecture :**
```
N bases de données (ou instances RDS) → 1 par tenant
Application: connexion string différente par tenant
```

**Forces :**
- Isolation maximale : aucune donnée partagée au niveau DB
- Backup/restore par tenant trivial
- Possible de migrer un tenant vers une région différente
- Performance : pas de contention entre tenants sur les indexes

**Faiblesses :**
- Coût : 100 instances RDS = ~$30 000/mois (db.t3.medium × 100) vs ~$300 (1 × db.r6g.large)
- Connexions : Prisma ouvre N connection pools (100 pools × 20 = 2 000 connexions simultanées)
- Migrations : CI doit appliquer les migrations sur 100+ bases → ~1h de CI
- Monitoring : 100 jeux de métriques CloudWatch → coût et complexité
- Onboarding tenant : provisionner RDS prend 10-15 min minimum
- Terraform state : 100 instances = state file massif

---

### Décision

**PostgreSQL Shared Database + Row Level Security (RLS)**

---

### Justification avec Critères Pondérés

| Critère | Poids | RLS Shared DB | Schéma/Tenant | DB/Tenant |
|---|---|---|---|---|
| Isolation sécurité | 30% | 8/10 | 8/10 | 10/10 |
| Coût opérationnel (infra) | 25% | 10/10 | 8/10 | 1/10 |
| Complexité migrations | 20% | 10/10 | 4/10 | 1/10 |
| Scalabilité (1k tenants) | 15% | 9/10 | 5/10 | 6/10 |
| Vitesse onboarding tenant | 10% | 10/10 | 6/10 | 2/10 |
| **Score pondéré total** | **100%** | **9.15/10** | **6.35/10** | **4.00/10** |

**Analyse des critères déterminants :**

- **Coût opérationnel (poids 25%)** : La différence de coût entre 1 instance RDS (~$300/mois) et 100+ instances ($30k+/mois) est rédhibitoire pour un SaaS en early stage. RLS est 100x moins coûteux à opérer.

- **Isolation sécurité (poids 30%)** : RLS obtient 8/10 et non 10/10 car l'isolation est "au niveau policy SQL" et non "au niveau instance". Cependant, avec `FORCE ROW LEVEL SECURITY`, `lms_app_role` sans bypass RLS, et des tests automatisés d'isolation, le risque résiduel est acceptable. Un audit de sécurité annuel validera l'isolation.

- **Complexité migrations (poids 20%)** : Une seule commande `prisma migrate deploy` en CI contre N commandes parallèles pour les autres options. La différence est critique pour la vélocité d'une équipe réduite.

- **Scalabilité** : À 1 000 tenants, le schéma RLS tient sans refactoring (ajout d'un tenant = 1 INSERT). L'option schéma/tenant devient non-viable au-delà de ~500 tenants (pg_catalog perf).

---

### Conséquences

**Positives :**
- 1 seul cluster RDS à opérer, monitorer, sauvegarder
- Prisma migrations en 1 commande pour tous les tenants
- Onboarding tenant en < 1 seconde (INSERT dans `tenants`)
- Pattern simple à auditer pour la conformité Loi 25

**Négatives et mitigations :**
- **Risque de fuite cross-tenant** : Mitigé par `FORCE ROW LEVEL SECURITY` + rôle applicatif sans bypass RLS + tests d'isolation automatisés dans le CI (un test tente explicitement d'accéder aux données d'un autre tenant).
- **Performance index** : Tous les index doivent inclure `tenant_id` en première position. Voir §6.2 du System Design. Impact : légère augmentation de la taille des index, négligeable.
- **Queries analytics cross-tenant** (SUPER_ADMIN) : Le rôle `SUPER_ADMIN` a un bypass RLS explicite et ne peut être utilisé que depuis l'API d'administration interne (route séparée, auth distincte).

**Chemin de migration futur :** Si LMS Kernel atteint 5 000+ tenants avec des problèmes de contention mesurés, la migration vers schéma-par-tenant est possible avec un outil custom (pg_dump par tenant_id + restore dans nouveau schéma). L'architecture RLS ne verrouille pas définitivement.

---

### Plan d'Implémentation

| Étape | Sprint | Responsable | Livrable |
|---|---|---|---|
| Prisma schema avec tenant_id | Sprint 01 | Backend Dev | LMSK-9 |
| Migration RLS (politiques SQL) | Sprint 01 | Backend Dev | LMSK-10 |
| `withTenantContext()` dans PrismaService | Sprint 01 | Backend Dev | `@lms/db` package |
| Tests d'isolation automatisés | Sprint 01 | QA | Suite Jest isolation |
| Audit RLS par Lead Sécurité | Sprint 02 | Isabelle Chen | Rapport d'audit |

---

## ADR-003 : Solution IAM — Keycloak 24 vs Auth0/Okta vs NextAuth.js Custom

**Identifiant :** ADR-003
**Date :** 2026-02-10
**Statut :** Accepté
**Décideurs :** Thomas Martin (Architecte Principal), Isabelle Chen (Lead Sécurité), Alexandra Dupont (CTO)

---

### Contexte

LMS Kernel est une plateforme multi-tenant SaaS québécoise soumise à la **Loi 25** (entrée en vigueur progressive 2022-2023). Cette loi exige que les renseignements personnels des résidents québécois soient traités et hébergés au Canada, sauf accord explicite de la personne concernée.

L'authentification traite des données personnelles (email, identité, historique de connexion). La solution IAM doit donc :
1. Héberger les données d'identité en territoire canadien (AWS ca-central-1)
2. Supporter OIDC et SAML2 (intégration SSO d'entreprise pour les tenants corporate)
3. Supporter le multi-tenant avec isolation des comptes par tenant
4. Permettre la MFA obligatoire pour les rôles ADMIN et INSTRUCTOR
5. Fournir un audit trail des connexions (Loi 25)

---

### Options Évaluées

#### Option A : Keycloak 24 (Self-Hosted sur AWS ca-central-1)

**Description :** Keycloak est une solution IAM open-source (Red Hat) mature. Déployé sur ECS Fargate en ca-central-1. Données d'identité dans RDS PostgreSQL ca-central-1.

**Protocoles :** OIDC, OAuth 2.0, SAML 2.0, LDAP/AD federation

**Forces :**
- **Données 100% en ca-central-1** : Conformité Loi 25 garantie sans dépendance externe
- SAML2 natif : SSO pour les clients corporatifs (universités, grandes entreprises)
- Realms : isolation multi-tenant native (1 realm ou groupes par tenant)
- MFA : TOTP, WebAuthn (FIDO2), SMS via SPI
- JWKS endpoint auto-géré, rotation des clés RS256 automatique
- Social login : Google, Microsoft via Identity Providers Keycloak
- Events et audit trail natifs (connexions, échecs, changements de mot de passe)
- Licence Apache 2.0 : coût = infrastructure uniquement (ECS + RDS ~$150/mois)
- Keycloak 24 : performance améliorée, startup < 10s (vs 45s en v17)
- Brute force protection native (max 5 tentatives, lockout 15 min)

**Faiblesses :**
- Complexité d'opération : mises à jour Keycloak, configuration Realm, gestion des clés
- Interface admin complexe (learning curve pour les DevOps)
- Haute disponibilité : nécessite au minimum 2 instances ECS + RDS Multi-AZ
- Documentation éparpillée (amélioration nette depuis Keycloak 22)

**Coût estimé :** ~$200/mois (ECS 2 tasks + RDS PostgreSQL partagé avec l'app)

#### Option B : Auth0 (SaaS externe, Okta identique)

**Description :** Auth0 (Okta) est le leader du marché IAM SaaS. API REST simple, SDK pour tous les frameworks, onboarding en < 1 heure.

**Forces :**
- Zéro opération : SaaS managé, 99.99% SLA
- Onboarding extrêmement rapide (1-2 jours d'intégration)
- SDK first-class : `@auth0/nextjs-auth0`, `@auth0/node-auth0`
- Dashboard analytics connexions, anomaly detection inclus
- SAML2, OIDC, social login, MFA : tout inclus
- Support enterprise 24/7

**Faiblesses :**
- **Données d'identité hors Canada** : Auth0 héberge par défaut aux US. La région `ca-central-1` n'est **pas disponible** chez Auth0 (disponible: US, EU, AU). **Violation potentielle Loi 25.**
- Auth0 Private Cloud (données en ca) : ~$30 000/mois — non viable pour un SaaS early stage
- Okta : même problème de résidence des données — région canadienne non disponible fin 2025
- Lock-in propriétaire : migration future vers une autre solution = refactoring complet
- Coût SaaS croissant avec les MAU : à 10 000 utilisateurs actifs/mois → ~$3 000/mois

**Note sur Okta :** Identique à Auth0 sur les dimensions critiques (conformité, coût, features). Okta a acquis Auth0 en 2021.

**Conformité Loi 25 :** **Non conforme sans Private Cloud** (> $30k/mois). Éliminatoire.

#### Option C : NextAuth.js v5 + Bibliothèques Custom

**Description :** NextAuth.js (auth.js) est une bibliothèque d'authentification pour Next.js. Nécessite de développer la couche IAM sur mesure pour les besoins avancés (SAML2, multi-tenant, MFA).

**Forces :**
- Intégration native Next.js App Router (handlers RSC)
- Contrôle total du code
- Coût zéro (open-source)
- Données 100% dans notre infra (ca-central-1)

**Faiblesses :**
- **Pas de SAML2 natif** : implémenter SAML2 (requis pour clients corporatifs) = 3-4 sprints de développement
- **Pas de gestion des sessions Keycloak-style** : sessions distribuées à implémenter
- **Pas de brute force protection** : à développer
- **MFA** : TOTP via `otplib` possible mais à intégrer manuellement
- **Audit trail connexions** : à développer
- **Rotation des clés RS256** : à opérer manuellement
- Maintenabilité : chaque développeur quittant l'équipe emporte la connaissance du code IAM custom
- Surface d'attaque : l'implémentation custom IAM est le vecteur d'attaque le plus risqué (CVE sur code maison non audité)

**Règle d'or sécurité :** Ne jamais écrire sa propre cryptographie ou son propre système d'authentification. Les bibliothèques spécialisées sont mieux auditées que tout code maison.

---

### Décision

**Keycloak 24 Self-Hosted sur AWS ECS Fargate ca-central-1**

---

### Justification avec Critères Pondérés

| Critère | Poids | Keycloak 24 | Auth0/Okta | NextAuth Custom |
|---|---|---|---|---|
| Conformité Loi 25 (résidence données) | 35% | 10/10 | 2/10 | 10/10 |
| Features IAM (SAML2, MFA, OIDC) | 25% | 10/10 | 10/10 | 4/10 |
| Coût (infra + licence) | 15% | 9/10 | 4/10 | 8/10 |
| Charge opérationnelle | 15% | 6/10 | 10/10 | 3/10 |
| Sécurité & audit | 10% | 9/10 | 9/10 | 4/10 |
| **Score pondéré total** | **100%** | **8.90/10** | **5.45/10** | **6.55/10** |

**Facteur éliminatoire — Auth0/Okta :**
La résidence des données est un critère **éliminatoire** pour LMS Kernel. Auth0 ne propose pas de région ca-central-1 à un coût viable. Le score de 2/10 sur le critère Loi 25 (poids 35%) rend Auth0 non-qualifié indépendamment de ses autres qualités.

**Keycloak vs NextAuth Custom :**
Keycloak gagne sur les features IAM (SAML2 critique pour les clients corporatifs = 25% du CA cible) et sur la sécurité (code mature, audité, CVE publiquement suivis). La charge opérationnelle supérieure de Keycloak est acceptable : 1 Realm, infrastructure partagée avec l'app, runbooks documentés.

---

### Conséquences

**Positives :**
- Conformité Loi 25 native : toutes les données d'identité en ca-central-1
- SAML2 disponible dès le Sprint 02 → pas de blocage pour les premiers clients corporatifs
- Rotation des clés RS256 automatique → gestion du risque clé compromises
- Brute force protection et audit trail natifs → moins de code sécurité à maintenir
- Keycloak Admin API : automatisation de la création de groupes tenant via notre backend

**Négatives et mitigations :**
- **Complexité opérationnelle** : Runbook Keycloak documenté dans `/ops/keycloak/runbook.md`. Déploiement Terraform codifié. Mise à jour via blue/green ECS.
- **Haute disponibilité** : Minimum 2 instances ECS Fargate, RDS Multi-AZ pour la base Keycloak (partagée avec l'app ou instance dédiée selon le volume). Health check ALB sur `/health/ready`.
- **Realm design** : 1 Realm `lms-kernel` global avec groupes par tenant (évite la complexité N realms). Client Keycloak par application (NestJS API, Next.js).
- **Upgrade Keycloak** : Politique de upgrade dans les 30 jours après release mineure, 7 jours après patch de sécurité (CVE).

---

### Plan d'Implémentation

| Étape | Sprint | Responsable | Livrable |
|---|---|---|---|
| Infrastructure Keycloak ECS + Terraform | Sprint 01 | DevOps | Keycloak accessible en staging |
| Realm `lms-kernel` configuration | Sprint 01 | Isabelle Chen | Realm exporté en JSON versionné |
| AuthGuard NestJS (JWKS) | Sprint 01 | Backend Dev | LMSK-11 |
| Next.js OIDC flow (Authorization Code + PKCE) | Sprint 02 | Frontend Dev | Login fonctionnel |
| SAML2 configuration (client tenant pilote) | Sprint 03 | Backend Dev + Isabelle | SSO enterprise validé |
| MFA TOTP obligatoire pour ADMIN/INSTRUCTOR | Sprint 02 | Backend Dev | Keycloak Required Actions |

---

## ADR-004 : Architecture Générale — Monolithe Modulaire vs Microservices vs BFF Pattern

**Identifiant :** ADR-004
**Date :** 2026-02-10
**Statut :** Accepté
**Décideurs :** Thomas Martin (Architecte Principal), Alexandra Dupont (CTO), Équipe complète

---

### Contexte

LMS Kernel démarre son développement avec une équipe de 6 développeurs (3 backend, 2 frontend, 1 fullstack). Le MVP doit être livrable en 6 sprints (3 mois). L'horizon business est de 3 ans avant une éventuelle levée de fonds série A qui permettrait d'agrandir l'équipe.

Les 12 modules fonctionnels planifiés (Auth, Tenant, User, Course, Enrollment, Assessment, Consent, Audit, Notification, Analytics, Plugin) ont des interactions nombreuses (ex: une inscription déclenche une notification, un audit log, et une mise à jour analytics).

**Question centrale :** Quelle granularité architecturale maximise la vitesse de livraison court terme sans hypothéquer l'évolutivité long terme ?

---

### Options Évaluées

#### Option A : Monolithe Modulaire (Bounded Contexts)

**Description :** Un seul processus NestJS avec des modules fortement encapsulés. Les modules communiquent via des interfaces TypeScript typées (services injectés) et un bus d'événements interne (EventEmitter ou NestJS Event Bus). Pas de réseau inter-services.

**Bounded contexts NestJS :**
```
AppModule
├── TenantModule      (contexte: multi-tenancy)
├── AuthModule        (contexte: IAM)
├── CourseModule      (contexte: catalogue)
├── EnrollmentModule  (contexte: inscriptions)
├── AssessmentModule  (contexte: évaluations)
├── NotificationModule (contexte: communications)
├── AnalyticsModule   (contexte: rapports)
├── AuditModule       (contexte: traçabilité)
└── ConsentModule     (contexte: conformité Loi 25)
```

**Forces :**
- **Vitesse de développement maximale** : pas de latence réseau, pas de contrats d'API inter-services à maintenir, pas d'infrastructure service-discovery
- Un seul déploiement ECS : CI/CD simple, un seul artefact Docker
- Debugging : stack traces cohérentes, un seul log stream à analyser
- Transactions ACID entre modules : `withTenantContext()` englobe plusieurs modules en une transaction
- Refactoring facile : IDE peut traverser les boundaries de modules
- Tests d'intégration simples : 1 process à démarrer

**Faiblesses :**
- Scaling uniforme : si le module Analytics consomme beaucoup de CPU, tout le monolithe scale
- Risque de coupling progressif : les développeurs peuvent contourner les interfaces de modules
- Déploiement tout-ou-rien : un bug dans Notification affecte potentiellement Course
- Pas de polyglot : tous les modules doivent être en TypeScript

**Mitigation du risque de coupling :**
- Règle d'équipe : **interdit d'importer un service d'un autre module directement** → passer par les interfaces exportées
- ESLint rule custom `no-cross-module-import` pour détecter les violations
- Architecture reviews hebdomadaires

#### Option B : Microservices dès le Départ

**Description :** Chaque module fonctionnel majeur est un service déployé indépendamment. Communication via gRPC (inter-services synchrone) et BullMQ/Kafka (asynchrone).

```
Services: lms-auth, lms-course, lms-enrollment,
          lms-assessment, lms-notification, lms-analytics
```

**Forces :**
- Scaling indépendant par service (Analytics peut scale séparément)
- Déploiements indépendants → moins de risque par déploiement
- Isolation des pannes : si Notification tombe, Course continue
- Polyglot possible à terme
- Meilleure séparation des responsabilités des équipes (1 squad par service)

**Faiblesses :**
- **Overhead opérationnel massif** : 6+ clusters ECS, 6+ log streams, 6+ pipelines CI/CD, service mesh (AWS App Mesh ou Istio)
- **Latence réseau** : une inscription = Course service → Enrollment service → Notification service → Analytics service. 4 appels réseau vs 1 appel local.
- **Transactions distribuées** : ACID impossible entre services. Nécessite Saga pattern, compensation. Complexité ×10.
- **Testing** : intégration nécessite tous les services simultanément (Docker Compose complexe ou test environments dédiés)
- **Délai MVP** : setup infrastructure microservices = 4-6 sprints avant le premier feature. Incompatible avec l'objectif 6 sprints MVP.
- **Coût infra** : 6+ services ECS (min 2 tasks chacun) = 12+ tasks en permanence vs 2-4 pour le monolithe
- Avec 6 développeurs : surcharge cognitive trop élevée. Recommandé à partir de 20-30 développeurs (règle des deux pizzas).

#### Option C : BFF Pattern (Backend for Frontend) + Monolithe Core

**Description :** Un service "BFF" (Backend for Frontend) par type de client (Web, Mobile à venir) qui agrège les appels vers un monolithe core. Le BFF gère l'adaptation des données pour chaque frontend.

```
lms-web-bff   (Next.js API Routes ou service dédié)
    ↓
lms-core (monolithe NestJS — toute la logique métier)
```

**Forces :**
- Séparation claire des préoccupations frontend/backend
- Le BFF peut être en Next.js (RSC Server Actions) — cohérence stack frontend
- Permet d'optimiser les payloads par client (Web vs Mobile différent)

**Faiblesses :**
- **Doublon de complexité** : ajouter un BFF sans raison immédiate (1 seul client Web pour le MVP)
- Latence additionnelle : Client → BFF → Core → DB (1 hop réseau de plus)
- 2 services à maintenir, déployer, monitorer dès le départ
- Next.js App Router avec Server Components **est déjà un BFF** : les RSC fetche l'API NestJS côté serveur, agrège, et envoie uniquement le HTML/RSC payload au navigateur. Le BFF Pattern est donc déjà implicitement implémenté par Next.js.
- Overhead disproportionné pour le MVP

---

### Décision

**Monolithe Modulaire avec Bounded Contexts + Chemin de Migration vers Microservices Préservé**

---

### Justification avec Critères Pondérés

| Critère | Poids | Monolithe Modulaire | Microservices | BFF + Core |
|---|---|---|---|---|
| Vitesse livraison MVP (6 sprints) | 30% | 10/10 | 2/10 | 7/10 |
| Adéquation taille d'équipe (6 devs) | 25% | 10/10 | 3/10 | 7/10 |
| Évolutivité long terme (3 ans) | 20% | 7/10 | 10/10 | 7/10 |
| Coût opérationnel | 15% | 9/10 | 3/10 | 7/10 |
| Testabilité | 10% | 9/10 | 5/10 | 7/10 |
| **Score pondéré total** | **100%** | **9.10/10** | **4.40/10** | **7.00/10** |

**Analyse des critères déterminants :**

- **Vitesse livraison MVP (poids 30%)** : Avec 6 développeurs et 6 sprints, les microservices ne permettent pas de livrer le MVP. Les 4-6 premiers sprints seraient consommés par l'infrastructure (service discovery, API gateway, distributed tracing, etc.). Le monolithe modulaire permet de livrer le premier feature dès le Sprint 01.

- **Adéquation taille d'équipe (poids 25%)** : La règle industry standard est 1 microservice = 1 équipe autonome (8-12 personnes min). Avec 6 développeurs totaux, les microservices créent une surcharge cognitive insupportable et ralentissent chaque feature (coordination inter-équipes → même équipe sur plusieurs services).

- **Évolutivité long terme (poids 20%)** : Le monolithe modulaire obtient 7/10 et non 10/10 car extraire un module en service indépendant nécessite du refactoring. Cependant, la stratégie de mitigation (bounded contexts stricts, interfaces publiées, bus d'événements) préserve le chemin de migration. Netflix, Shopify et Stack Overflow ont tous commencé par des monolithes avant de migrer.

- **BFF + Core** : Solution intermédiaire viable mais Next.js App Router avec RSC implémente déjà le pattern BFF côté frontend (Server Components fetch l'API NestJS server-side). Ajouter un BFF dédié serait de la sur-ingénierie prématurée.

---

### Conséquences

**Positives :**
- MVP livrable en Sprint 06 avec les 12 modules fonctionnels
- 1 seul pipeline CI/CD, 1 artefact Docker, 1 cluster ECS
- Debugging simplifié : une stack trace complète, un seul log stream
- Transactions ACID entre modules : inscription + audit log + notification en 1 transaction DB
- Onboarding d'un nouveau développeur : 1 repo, 1 architecture à comprendre

**Négatives et mitigations :**

- **Risque de coupling** : 
  - ESLint rule custom `@lms/no-cross-module-imports`
  - Chaque module n'exporte que ses interfaces publiques dans `index.ts`
  - Architecture review mensuelle avec cartographie des dépendances

- **Scaling non-granulaire** : 
  - À court terme (MVP), le profil de charge est homogène. Analytics intensif → prévu via workers BullMQ séparés (déjà un processus différent).
  - Si Analytics devient un goulot d'étranglement mesuré, c'est le premier module extrait en service (horizon 18 mois).

- **Déploiement tout-ou-rien** : 
  - Mitigé par le canary deploy 5%→25%→100% (ADR-001 + pipeline CI/CD)
  - Tests de couverture 80% + mutation testing réduisent le risque de régressions

**Chemin de migration future vers microservices (horizon 2-3 ans) :**

Le monolithe modulaire est conçu pour faciliter l'extraction future :

```
Étape 1 (Sprint 01-06) : Monolithe modulaire strict
  → Tous les modules communiquent via EventBus interne
  → Pas d'imports cross-module directs

Étape 2 (Horizon 18 mois) : Extract Analytics + Notification
  → Ces modules n'ont pas besoin de transactions ACID avec le core
  → Migration EventBus interne → BullMQ messages (changement minimal)
  → 2 services indépendants, reste monolithe

Étape 3 (Horizon 3 ans, post Série A) :
  → Extraction basée sur les bottlenecks mesurés en production
  → Jamais spéculative : uniquement si métriques le justifient
```

---

### Plan d'Implémentation

| Étape | Sprint | Responsable | Livrable |
|---|---|---|---|
| Structure monorepo (Turborepo) | Sprint 01 | Architecte | `apps/`, `packages/` en place |
| `@lms/core` (KernelModule, EventBus) | Sprint 01 | Architecte | Package publié |
| ESLint rule no-cross-module-imports | Sprint 01 | Lead Backend | Lint configuré en CI |
| 5