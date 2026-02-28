# Vision Technique — LMS Kernel

> Statut : Approuvé | Version : 1.0 | Date : 2026-02-28 | Auteur : Alexandra Dupont, CTO

---

## 1. Résumé Exécutif

LMS Kernel est une plateforme de gestion de l'apprentissage (LMS) multi-tenant, construite sur une architecture **monolithe modulaire évolutive**. La décision architecturale fondamentale est de livrer une base monolithique bien découpée en modules métier indépendants (bounded contexts), conçue dès le premier jour pour être décomposée en microservices à horizon 3 ans, sans réécriture.

La plateforme est hébergée exclusivement sur AWS **ca-central-1** (Canada — Montréal) pour satisfaire à la Loi 25 sur la protection des renseignements personnels du Québec. Elle repose sur NestJS 10 + Fastify côté backend et Next.js 14 App Router côté frontend, avec Keycloak 24 comme unique Identity Provider (IDP) pour l'authentification et l'autorisation.

Les principes directeurs de l'architecture sont : **isolation stricte des tenants par défaut** (Row Level Security PostgreSQL + subdomain routing), **conformité by design** (Loi 25, WCAG 2.1 AA), **auditabilité totale** (hash chain SHA-256 immuable), et **extensibilité contrôlée** via un système de plugins (KernelModule) avec cycle de vie explicite.

Cette vision technique gouverne l'ensemble des décisions d'architecture, de stack, de sécurité et de qualité pour la version 1.0 (Go-live 2026-06-01) et pose les fondations de la Phase 2 (IA/ML, mobile, marketplace) prévue au Q3-Q4 2026.

---

## 2. Contexte et Enjeux

### 2.1 Contexte réglementaire

La **Loi 25** (Loi modernisant des dispositions législatives en matière de protection des renseignements personnels, L.Q. 2021, c. 25) impose depuis septembre 2023 des obligations strictes aux entreprises québécoises :

- **Résidence des données** : Les renseignements personnels des résidents québécois doivent être hébergés au Canada ou, s'ils transitent hors du Canada, faire l'objet d'une évaluation des facteurs relatifs à la vie privée (EFVP) préalable. LMS Kernel retient la solution la plus simple : hébergement 100 % AWS ca-central-1, aucune donnée personnelle ne quitte le territoire canadien.
- **Consentement explicite** : Toute collecte de données personnelles doit être justifiée par une base légale explicite (consentement, obligation légale, intérêt légitime). Le module Consent de LMS Kernel implémente ce registre de traitements au niveau de la couche de données.
- **Droit à l'oubli et portabilité** : L'apprenant peut demander la suppression ou l'export de ses données. L'API User expose les endpoints `/me/export` (JSON/CSV) et `/me/delete` avec workflow de confirmation multi-étapes.
- **Audit trail** : La CAI peut exiger la démonstration de la traçabilité des accès aux données personnelles. Le package @lms/audit répond à cette exigence avec un journal immuable.
- **Sanctions** : Jusqu'à 25 M CAD ou 4 % du chiffre d'affaires mondial en cas de violation grave.

### 2.2 Contexte technique

Le marché LMS est dominé par des solutions monolithiques vieillissantes (Moodle, Chamilo) ou des plateformes SaaS américaines (Canvas, D2L) dont l'architecture ne permet pas l'isolation garantie des données par tenant au niveau base de données. LMS Kernel choisit délibérément le **Row Level Security (RLS) PostgreSQL** comme mécanisme primaire d'isolation — une garantie de sécurité que les architectures applicatives seules (filtrage ORM) ne peuvent pas offrir.

### 2.3 Enjeux architecturaux

| Enjeu | Décision technique retenue |
|-------|---------------------------|
| Isolation données multi-tenant | RLS PostgreSQL 16 + colonne `tenant_id` indexée sur toutes les tables |
| Routing multi-tenant | Subdomain extraction (org1.lms.example.com → tenantId) en middleware NestJS |
| Authentification centralisée | Keycloak 24 (OIDC/SAML), délégation totale, aucun mot de passe stocké dans LMS Kernel |
| Extensibilité sans couplage | Système de plugins KernelModule avec cycle de vie isolé |
| Conformité Loi 25 by design | Consent management au niveau ORM (Prisma middleware) + Audit trail immuable |
| Accessibilité universelle | WCAG 2.1 AA comme gate CI, composants Radix UI accessibles par défaut |
| Évolutivité vers microservices | Bounded contexts NestJS modules + interfaces de contrat (DTOs) + EventEmitter interne (→ futur message broker) |

---

## 3. Vision Architecturale

### 3.1 Architecture actuelle — Monolithe Modulaire (Phase 1, 2026)

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTS                               │
│  Browser (Next.js 14)  │  Mobile PWA  │  API Consumers  │
└───────────┬─────────────────────┬───────────────────────┘
            │ HTTPS               │ HTTPS
            ▼                     ▼
┌───────────────────────────────────────┐
│           AWS ALB + WAF               │
│  (ca-central-1, HTTPS uniquement)     │
└───────────┬───────────────────────────┘
            │
┌───────────▼───────────────────────────┐
│        NestJS 10 + Fastify            │
│   ┌─────────────────────────────┐     │
│   │  Middleware Tenant (LMSK-12)│     │  subdomain → tenantId
│   │  AuthGuard Keycloak (LMSK-11)│    │  JWT JWKS validation
│   └─────────────────────────────┘     │
│                                        │
│   ┌──────────┐ ┌──────────┐ ┌───────┐ │
│   │  Module  │ │  Module  │ │Module │ │
│   │   Auth   │ │  Tenant  │ │ User  │ │
│   └──────────┘ └──────────┘ └───────┘ │
│   ┌──────────┐ ┌──────────┐ ┌───────┐ │
│   │  Module  │ │  Module  │ │Module │ │
│   │  Course  │ │ Enroll.  │ │Assess.│ │
│   └──────────┘ └──────────┘ └───────┘ │
│   ┌──────────┐ ┌──────────┐ ┌───────┐ │
│   │  Module  │ │  Module  │ │Module │ │
│   │ Consent  │ │  Audit   │ │Notif. │ │
│   └──────────┘ └──────────┘ └───────┘ │
│   ┌──────────────────────────────────┐ │
│   │    KernelModule Plugin System    │ │
│   └──────────────────────────────────┘ │
└───────────┬───────────────────────────┘
            │
    ┌───────┴──────────────────────┐
    │                              │
┌───▼────────────────┐   ┌────────▼──────────┐
│  PostgreSQL 16 RDS │   │  Redis 7          │
│  + RLS par tenant  │   │  ElastiCache      │
│  (ca-central-1)    │   │  + BullMQ queues  │
└────────────────────┘   └───────────────────┘

┌──────────────────────────────────────┐
│  Keycloak 24 (ECS self-hosted)       │
│  OIDC / SAML2 / JWKS endpoint        │
└──────────────────────────────────────┘
```

### 3.2 Vision cible — Microservices (Phase 3, 2028-2029)

L'architecture monolithique modulaire est conçue pour être décomposée progressivement. Chaque module NestJS correspond à un **bounded context** qui deviendra un microservice autonome :

```
Phase 1 (2026) : Monolithe Modulaire
         ↓ Extraction progressive (strangler fig pattern)
Phase 2 (2027) : Hybrid — Auth/Consent extraits en services autonomes
         ↓
Phase 3 (2028) : Microservices full — API Gateway + Message Broker (AWS MSK/Kafka)

Services cibles :
  - auth-service          (Keycloak + token management)
  - tenant-service        (provisionnement, routing, feature flags)
  - user-service          (identités, rôles, RGPD)
  - consent-service       (Loi 25, registre traitements)
  - audit-service         (hash chain, journal immuable)
  - course-service        (catalogue, contenu, SCORM)
  - enrollment-service    (inscriptions, progression)
  - assessment-service    (évaluations, notes)
  - notification-service  (email, in-app, webhooks)
  - analytics-service     (agrégation, reporting)
  - plugin-service        (registre, sandboxing)
  - ai-service            (recommandations ML — Phase 2)
```

**Stratégie de migration** : Le bus d'événements interne (EventEmitter2 NestJS) sera remplacé par AWS MSK (Kafka managé) sans modification des producteurs/consommateurs grâce à une couche d'abstraction `EventBus` interne. Les DTOs de contrat entre modules sont versionnés dès la Phase 1 pour éviter les breaking changes lors de l'extraction.

### 3.3 Flux Multi-Tenant

```
1. Requête entrante : https://collegecm.lms.example.com/api/courses
2. ALB → ECS (NestJS)
3. TenantMiddleware : extrait "collegecm" du subdomain
4. Lookup Redis (cache) : collegecm → { tenantId: "uuid-1234", config: {...} }
   (Cache miss → lookup PostgreSQL tenants table → mise en cache 5 min)
5. Injection tenantId dans le contexte de la requête (AsyncLocalStorage)
6. AuthGuard : validation JWT Keycloak (JWKS endpoint public)
   - Vérification claim "tenant_id" du token = tenantId résolu
   - Vérification rôle dans claim "realm_roles"
7. Prisma middleware : SET app.current_tenant = 'uuid-1234'
   → PostgreSQL RLS applique automatiquement le filtre tenant_id
8. Handler NestJS : logique métier sans connaissance du tenant_id
9. @lms/audit : log de l'event avec tenant_id, user_id, timestamp, hash
10. Réponse : données exclusivement du tenant "collegecm"
```

---

## 4. Choix Technologiques

### 4.1 Backend — NestJS 10 + Fastify

**Pourquoi NestJS ?**
NestJS impose une structure modulaire par convention (modules, controllers, services, guards, interceptors) qui correspond exactement à notre besoin de bounded contexts clairs. La métaphore des modules NestJS est directement alignée sur notre future décomposition microservices.

**Pourquoi Fastify plutôt qu'Express ?**
Fastify offre des performances 2× à 3× supérieures à Express pour des charges I/O intensives, avec un support natif du JSON Schema pour la validation des routes et une meilleure gestion des erreurs. Pour un LMS à forte charge (cours, quiz, analytics), ce gain de performance est structurel.

```typescript
// Exemple : AuthGuard avec validation JWKS Keycloak
@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  constructor(
    private readonly jwksClient: JwksClient,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Token manquant');

    const decoded = jwt.decode(token, { complete: true }) as jwt.Jwt;
    const key = await this.jwksClient.getSigningKey(decoded.header.kid);
    const verified = jwt.verify(token, key.getPublicKey(), {
      algorithms: ['RS256'],
      audience: 'lms-kernel',
    }) as JwtPayload;

    // Validation cross-tenant : le claim tenant_id doit correspondre au subdomain
    const currentTenantId = this.tenantContext.getTenantId();
    if (verified.tenant_id !== currentTenantId) {
      throw new ForbiddenException('Token tenant mismatch');
    }
    request.user = { id: verified.sub, roles: verified.realm_access.roles, tenantId: verified.tenant_id };
    return true;
  }
}
```

**TypeScript strict** : Le `tsconfig.json` active `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`. Aucune dérogation n'est acceptée ; les PRs échouant la vérification de types sont bloquées par le pipeline CI.

### 4.2 Frontend — Next.js 14 App Router

**Pourquoi Next.js 14 App Router ?**
Le App Router (React Server Components) permet de rendre côté serveur les pages qui nécessitent des données tenant-spécifiques sans exposer la logique de routing au client. La résolution du tenant par subdomain est effectuée dans le middleware Next.js (`middleware.ts`), qui redirige les utilisateurs non authentifiés vers Keycloak avant même que React ne s'initialise.

**Stratégie de rendu :**
- Pages LEARNER (dashboard, cours) : Server Components + Suspense pour streaming progressif
- Pages interactives (quiz, éditeur de cours) : Client Components isolés
- Pages d'administration (analytics) : Hybrid avec React Server Components pour les données + recharts côté client

**Accessibilité WCAG 2.1 AA :**
Le design system est construit sur **Radix UI** (primitives accessibles par défaut) + **Tailwind CSS**. Les composants Radix implémentent les patterns ARIA WAI-ARIA 1.1 (Dialog, Tabs, Select, Combobox...) sans intervention manuelle. La gate CI axe-core analyse l'intégralité des routes statiques à chaque build et bloque la PR si une violation de niveau A ou AA est détectée.

```typescript
// middleware.ts — Next.js subdomain tenant resolution
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const subdomain = host.split('.')[0]; // "collegecm" depuis "collegecm.lms.example.com"
  
  // Propagation du tenantSlug vers les Server Components via header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', subdomain);
  
  return NextResponse.next({ request: { headers: requestHeaders } });
}
```

### 4.3 Authentification — Keycloak 24

Keycloak est l'**unique point d'authentification** pour l'ensemble de la plateforme. LMS Kernel ne stocke aucun mot de passe et ne gère aucune session d'authentification — tout est délégué à Keycloak.

**Configuration par tenant :**
Chaque tenant dispose de son propre **Realm Keycloak**, ce qui garantit l'isolation totale des identités, des politiques de mot de passe, des fédérations d'annuaire (LDAP/AD) et des providers sociaux (Google, Microsoft).

**Flux d'authentification :**
```
User → Next.js (page protégée)
  → Redirect vers Keycloak /realms/{tenant-slug}/protocol/openid-connect/auth
  → Authentification (password / SSO SAML / Fédération LDAP)
  → Keycloak émet JWT (access_token + refresh_token)
    Claims JWT : sub, email, realm_access.roles, tenant_id, preferred_username
  → Redirect vers Next.js avec code
  → Next.js échange le code contre les tokens (server-side, NextAuth.js adapter)
  → access_token transmis aux appels API NestJS (Bearer header)
  → NestJS valide le JWT via JWKS endpoint public Keycloak
```

**SAML2 pour SSO institutionnel :** Les universités utilisant Active Directory Federation Services (ADFS) ou Azure AD sont fédérées via le broker SAML2 de Keycloak. L'équipe des professeurs se connecte avec leurs identifiants institutionnels sans compte séparé.

### 4.4 Base de Données — PostgreSQL 16 + Prisma + RLS

**PostgreSQL 16** est choisi pour ses capacités RLS natives, ses performances sur les requêtes analytiques (window functions, CTEs récursifs), et la maturité de son écosystème.

**Row Level Security — Implémentation :**

```sql
-- Activation RLS sur toutes les tables métier
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ... (toutes les tables avec données tenant-spécifiques)

-- Politique d'isolation par tenant
CREATE POLICY tenant_isolation ON courses
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

**Prisma Middleware — Injection du tenant_id :**

```typescript
// prisma.service.ts — injection automatique du tenant context
prisma.$use(async (params, next) => {
  const tenantId = tenantContext.getTenantId(); // AsyncLocalStorage
  await prisma.$executeRaw`SET app.current_tenant = ${tenantId}`;
  return next(params);
});
```

**Conventions de schéma Prisma :**
- Toutes les tables incluent : `id UUID @default(uuid())`, `tenantId UUID`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
- Les tables d'audit (`audit_logs`) sont en **append-only** (aucun UPDATE/DELETE autorisé via politique RLS restrictive au rôle `audit_writer`)
- Index composites systématiques sur `(tenant_id, id)` et `(tenant_id, created_at)` pour les performances

**Migrations :** Gérées exclusivement via `prisma migrate deploy` dans le pipeline CI. Aucune modification de schéma ad hoc en production n'est autorisée.

### 4.5 Cache et Files d'Attente — Redis 7 + BullMQ

**Redis 7** via AWS ElastiCache (cluster mode, Multi-AZ) sert trois rôles :

1. **Cache session Keycloak** : Validation des tokens (TTL = durée de vie du token access, max 15 min) pour éviter les appels répétés au JWKS endpoint
2. **Cache tenant lookup** : Mapping `slug → tenantId + configuration` (TTL = 5 min)
3. **Cache analytics** : Compteurs de progression et statistiques pré-agrégées (TTL = 1 min)

**BullMQ** gère les jobs asynchrones :

| Queue | Responsabilité | Workers | Retry policy |
|-------|----------------|---------|--------------|
| `notifications` | Envoi emails AWS SES | 3 | 3 retries, backoff exponentiel |
| `audit-flush` | Écriture batch audit trail | 1 | 5 retries, DLQ sur échec |
| `scorm-import` | Traitement packages SCORM | 2 | 2 retries, DLQ sur échec |
| `analytics-aggregate` | Agrégation données tableau de bord | 1 | 1 retry, alerting Datadog |
| `consent-archive` | Archivage consentements révoqués | 1 | 3 retries |

### 4.6 Infrastructure AWS ca-central-1

```
┌─────────────────────────────────────────────────────────────────┐
│                    AWS ca-central-1                              │
│                                                                  │
│  Route 53 (DNS wildcard *.lms.example.com)                       │
│       ↓                                                          │
│  CloudFront (CDN assets statiques, Next.js ISR)                  │
│       ↓                                                          │
│  Application Load Balancer (HTTPS, certificat ACM)              │
│       │                          │                               │
│  ECS Fargate (NestJS API)   ECS Fargate (Next.js SSR)          │
│  Task: 2 vCPU, 4 GB RAM     Task: 1 vCPU, 2 GB RAM             │
│  Min: 2 tasks, Max: 20      Min: 2 tasks, Max: 10               │
│       │                          │                               │
│  ┌────┴──────────────────────────┤                               │
│  │   RDS PostgreSQL 16           │  ElastiCache Redis 7          │
│  │   Multi-AZ, db.r6g.xlarge     │  Cluster, cache.r6g.large     │
│  │   Storage: 500 GB gp3         │  3 nodes                      │
│  │   PITR: 7 jours               │                               │
│  └───────────────────────────────┘                               │
│                                                                  │
│  ECS Fargate (Keycloak 24)                                       │
│  RDS PostgreSQL (Keycloak DB, séparé)                            │
│                                                                  │
│  S3 (assets cours : PDF, vidéos — chiffrement SSE-S3)           │
│  CloudWatch Logs + Metrics                                       │
│  AWS WAF (règles OWASP Top 10)                                  │
│  AWS Secrets Manager (secrets applicatifs)                       │
│  ECR (registre images Docker privé)                              │
└─────────────────────────────────────────────────────────────────┘
```

**IaC** : L'intégralité de l'infrastructure est décrite en **Terraform** (modules réutilisables par environnement : dev, staging, production). Aucune ressource AWS n'est créée manuellement en production. L'état Terraform est stocké dans S3 + DynamoDB (locking).

---

## 5. Stratégie Qualité

### 5.1 Pyramide de tests

```
         ┌───────────┐
         │  E2E (5%) │  Playwright — parcours critiques utilisateur
        ┌┴───────────┴┐
        │Intégration  │  Supertest + Testcontainers (PostgreSQL in-process)
        │  (25%)      │  Tests d'isolation RLS inter-tenant obligatoires
       ┌┴─────────────┴┐
       │ Unitaires     │  Jest — services, guards, middlewares, utils
       │   (70%)       │  Mocking Prisma avec prisma-mock
       └───────────────┘
```

**Seuils de couverture (gate CI bloquante) :**
- Backend NestJS : ≥ 80 % lignes
- Frontend Next.js : ≥ 70 % lignes
- Package @lms/audit : ≥ 95 % lignes (criticité sécurité/conformité)

### 5.2 Tests de sécurité obligatoires

- **Tests d'isolation tenant** : Chaque suite de tests d'intégration vérifie qu'un utilisateur d'un tenant A ne peut pas accéder aux données d'un tenant B, même avec un token JWT valide.
- **SAST** : Semgrep avec ruleset NestJS/TypeScript dans le pipeline CI (bloquant sur findings HIGH/CRITICAL)
- **SCA** : `npm audit --audit-level=high` dans CI (bloquant)
- **Pentest interne** : Sprint 05, conduit par Isabelle Chen avec outils OWASP ZAP + Burp Suite Community

### 5.3 Accessibilité — Gate CI WCAG 2.1 AA

```yaml
# .github/workflows/accessibility.yml (extrait)
- name: Audit WCAG axe-core
  run: |
    npx @axe-core/cli http://localhost:3000 \
      --include "main, nav, footer" \
      --exit  # Exit code 1 si violation A ou AA détectée
```

Les pages analysées en CI couvrent : login, dashboard learner, dashboard instructor, page de cours, quiz, page de consentement, dashboard admin. Un rapport HTML est archivé comme artefact de build.

### 5.4 Tests de performance

**Outil** : k6 (scripts TypeScript)
**Profil de charge nominal** : 100 requêtes/seconde par tenant, 10 tenants simultanés (1 000 req/s global)
**Profil de pointe** : 5× charge nominale (test de stress Sprint 05)

**Seuils k6 (bloquants) :**
```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],  // ms
    http_req_failed: ['rate<0.001'],                  // < 0.1% erreurs
    http_reqs: ['rate>100'],                          // débit minimum
  },
};
```

---

## 6. Stratégie Données

### 6.1 Modèle de données principal

```prisma
// schema.prisma (simplifié — tables principales)

model Tenant {
  id          String   @id @default(uuid()) @db.Uuid
  slug        String   @unique  // "collegecm"
  name        String
  domain      String   @unique  // "collegecm.lms.example.com"
  config      Json     @default("{}")  // branding, features flags, quotas
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       User[]
  courses     Course[]
  auditLogs   AuditLog[]
  consents    Consent[]
}

model User {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  keycloakId   String   @unique  // sub claim Keycloak
  email        String
  role         Role     // SUPER_ADMIN | TENANT_ADMIN | INSTRUCTOR | AUDITOR | LEARNER
  profile      Json     @default("{}")
  isActive     Boolean  @default(true)
  deletedAt    DateTime?  // soft delete Loi 25
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  consents     Consent[]
  enrollments  Enrollment[]
  @@unique([tenantId, email])
  @@index([tenantId])
}

model Consent {
  id          String      @id @default(uuid()) @db.Uuid
  tenantId    String      @db.Uuid
  userId      String      @db.Uuid
  purpose     String      // "analytics", "marketing_email", "profiling"
  legalBasis  LegalBasis  // CONSENT | LEGAL_OBLIGATION | LEGITIMATE_INTEREST
  granted     Boolean
  grantedAt   DateTime?
  revokedAt   DateTime?
  ipAddress   String?     // chiffré en base
  userAgent   String?
  version     String      // version de la politique de confidentialité
  createdAt   DateTime    @default(now())
  user        User        @relation(fields: [userId], references: [id])
  tenant      Tenant      @relation(fields: [tenantId], references: [id])
  @@index([tenantId, userId])
}

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  actorId     String?  @db.Uuid  // null pour les events système
  action      String   // "USER_LOGIN", "COURSE_CREATED", "CONSENT_REVOKED"...
  resource    String   // "User", "Course", "Consent"...
  resourceId  String?
  payload     Json     @default("{}")
  previousHash String  // hash du log précédent (chain)
  hash        String   // SHA-256(previousHash + timestamp + tenantId + actorId + action + payload)
  createdAt   DateTime @default(now())
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  @@index([tenantId, createdAt])
}
```

### 6.2 Stratégie de rétention et de purge (Loi 25)

| Type de donnée | Rétention active | Archivage | Purge |
|----------------|-----------------|-----------|-------|
| Données apprenants (profil, progression) | Durée du contrat + 1 an | S3 Glacier (chiffré) | À expiration + 90 jours |
| Logs d'authentification | 90 jours actifs | 1 an archive | Purge automatique |
| Audit trail (AuditLog) | 5 ans (obligation légale) | S3 Glacier Instant Retrieval | Jamais (conformité) |
| Consentements | Durée de vie du consentement + 5 ans | Archive | Sur demande utilisateur (droit à l'oubli) |
| Données de performance (analytics agrégées) | 2 ans | — | Purge automatique |
| Données personnelles (email, nom) | Durée contrat | Anonymisation | Sur demande ou fin contrat |

**Anonymisation vs suppression** : Sur demande de droit à l'oubli, les données personnelles identifiantes sont anonymisées (remplacement par des hash irréversibles) plutôt que supprimées, afin de préserver l'intégrité de l'audit trail et des statistiques anonymes.

### 6.3 Sauvegarde et récupération

- **RDS** : Snapshots automatiques quotidiens, PITR (Point-In-Time Recovery) 7 jours, snapshots manuels avant chaque migration
- **ElastiCache Redis** : Snapshots quotidiens (données non critiques, reconstruction possible depuis DB)
- **S3 (assets cours)** : Versioning activé, réplication cross-AZ dans ca-central-1
- **RTO (Recovery Time Objective)** : < 4 heures
- **RPO (Recovery Point Objective)** : < 1 heure

---

## 7. Stratégie Sécurité

### 7.1 Principes fondamentaux

LMS Kernel applique une stratégie de sécurité en **défense en profondeur** (defense in depth) avec quatre couches :

1. **Périmètre réseau** : AWS WAF (règles OWASP Top 10), Security Groups restrictifs (principe du moindre privilège), VPC sans IP publique sauf ALB
2. **Transport** : TLS 1.3 minimum sur tous les endpoints, HSTS avec preload, certificats ACM auto-renouvelés
3. **Application** : AuthGuard systématique, validation RLS en base, sanitisation des entrées (class-validator), rate limiting par tenant (NestJS Throttler)
4. **Données** : Chiffrement au repos (RDS: AES-256, S3: SSE-S3, ElastiCache: at-rest encryption), aucune donnée personnelle en clair dans les logs

### 7.2 Gestion des identités et des accès (IAM)

**Matrice des permissions par rôle :**

| Ressource / Action | SUPER_ADMIN | TENANT_ADMIN | INSTRUCTOR | AUDITOR | LEARNER |
|-------------------|-------------|--------------|------------|---------|---------|
| Gérer les tenants | CRUD | — | — | — | — |
| Gérer les utilisateurs du tenant | — | CRUD | Read (ses cours) | Read | Read (soi) |
| Créer/modifier des cours | — | CRUD | CRUD (ses cours) | Read | Read (inscrits) |
| Inscrire des apprenants | — | CRUD | Create (ses cours) | Read | Create (soi) |
| Consulter l'audit trail | Read | Read (son tenant) | — | Read (son tenant) | — |
| Exporter les données (RGPD) | — | — | — | — | Read (ses données) |
| Gérer les consentements | — | Read | — | Read | CRUD (siens) |
| Accéder aux analytics | Read all | Read (son tenant) | Read (ses cours) | Read (son tenant) | Read (sa progression) |

**Keycloak Realm par tenant :** L'isolation des identités est garantie au niveau Keycloak — un utilisateur d'un realm ne peut jamais obtenir de token valide pour un autre realm.

### 7.3 Audit Trail Immuable (@lms/audit)

Le package `@lms/audit` implémente un journal d'événements immuable à chaîne de hachage :

```typescript
// Algorithme de hash chain (SHA-256)
function computeHash(event: AuditEvent, previousHash: string): string {
  const payload = JSON.stringify({
    previousHash,
    timestamp: event.createdAt.toISOString(),
    tenantId: event.tenantId,
    actorId: event.actorId ?? 'SYSTEM',
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId ?? '',
    payloadHash: sha256(JSON.stringify(event.payload)),
  });
  return sha256(payload);
}

// Vérification de l'intégrité de la chaîne
async function verifyChain(tenantId: string, from: Date, to: Date): Promise<boolean> {
  const logs = await prisma.auditLog.findMany({
    where: { tenantId, createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: 'asc' },
  });
  for (let i = 1; i < logs.length; i++) {
    const expected = computeHash(logs[i], logs[i - 1].hash);
    if (expected !== logs[i].hash) return false;  // Rupture détectée
  }
  return true;
}
```

**Garanties d'immuabilité :**
- La politique RLS `audit_immutable` interdit tout UPDATE/DELETE sur `audit_logs` pour tous les rôles sauf `audit_system` (utilisateur de service BullMQ)
- Le rôle AUDITOR a un accès `SELECT` uniquement sur `audit_logs`
- Les exports PDF de l'audit trail sont signés numériquement (AWS KMS)

### 7.4 Gestion du Consentement (Loi 25)

```typescript
// Exemple : vérification du consentement avant traitement analytics
@Injectable()
export class ConsentGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    const purpose = Reflect.getMetadata('consent_purpose', context.getHandler());
    
    if (!purpose) return true;  // Pas de consentement requis pour cette route
    
    const consent = await this.consentService.getActiveConsent(
      user.tenantId,
      user.id,
      purpose,
    );
    
    if (!consent?.granted) {
      throw new ForbiddenException(`Consentement requis pour : ${purpose}`);
    }
    return true;
  }
}

// Utilisation sur un endpoint analytics
@Get('progress')
@RequiresConsent('analytics')
async getMyProgress(@CurrentUser() user: AuthUser) { ... }
```

### 7.5 Secrets et Configuration

- **AWS Secrets Manager** : Tous les secrets (DSN PostgreSQL, credentials Redis, clés API SES, secrets Keycloak) sont stockés dans Secrets Manager et injectés au démarrage du container ECS via l'intégration native ECS Secrets
- **Rotation automatique** : Rotation des secrets RDS et Keycloak client secrets toutes les 90 jours via Secrets Manager rotation Lambda
- **Variables d'environnement** : Seules les variables non sensibles (feature flags, région AWS, URLs publiques) sont en variables d'environnement ECS Task Definition
- **Aucun secret en code ou en git** : Le pipeline CI inclut un scan `truffleHog` sur chaque PR

---

## 8. Équipe

### 8.1 Structure et responsabilités

| Rôle | Nom | Responsabilités clés | Disponibilité |
|------|-----|---------------------|---------------|
| CTO / Product Owner | Alexandra Dupont | Vision technique, architecture globale, arbitrages, relation clients pilotes, go/no-go | 100 % |
| Architecte Principal | Thomas Martin | Conception modules, revue de code technique, ADR (Architecture Decision Records), mentor équipe | 100 % |
| Lead Backend | À recruter (Senior NestJS/TypeScript) | Modules NestJS, API REST, Prisma, BullMQ, tests backend | 100 % |
| Lead Frontend | À recruter (Senior Next.js/React) | App Router, design system, WCAG, SSR/ISR, tests frontend | 100 % |
| Lead DevOps | À recruter (AWS/Terraform/GitHub Actions) | IaC, CI/CD, monitoring, sécurité infra, PRA | 100 % |
| Lead QA | À recruter (Automatisation/Accessibilité) | Stratégie de tests, automatisation, gates CI, rapports qualité | 100 % |
| Lead Sécurité | Isabelle Chen (CISSP) | Architecture sécurité, RLS, Loi 25, pentest, audit trail | 40 % |

### 8.2 Processus de travail

**Sprints de 2 semaines** avec les cérémonies Scrum suivantes :
- **Sprint Planning** (lundi J1, 2h) : Sélection et décomposition des tickets Jira
- **Daily Standup** (tous les jours, 15 min, asynchrone si remote) : Avancement, blocages
- **Sprint Review** (vendredi J10, 1h) : Démo des livrables acceptés au Product Owner
- **Rétrospective** (vendredi J10, 1h) : Processus, amélioration continue
- **Refinement** (mercredi J7, 1h) : Grooming du backlog Sprint+1

**Conventions de développement :**
- Branche `main` protégée : toute modification par PR uniquement
- PR requiert : 1 approbateur (Thomas Martin pour les PRs architecture), pipeline CI vert, pas de review comments ouverts
- Convention de commits : Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- Semantic versioning : `MAJOR.MINOR.PATCH-rc.N` (ex: `1.0.0-rc.1`)
- **Architecture Decision Records (ADR)** : Toute décision architecturale significative est documentée dans `docs/adr/` avec le template MADR

---

## 9. Roadmap Technique

### 9.1 Phase 1 — LMS Kernel v1.0 (2026)

```
Sprint 01 (2026-02-26 → 03-12) : Foundation
  ├── Schéma Prisma (Tenant, User, Consent, AuditLog) [LMSK-9]
  ├── Migrations RLS PostgreSQL [LMSK-10]
  ├── AuthGuard Keycloak JWT/JWKS [LMSK-11]
  ├── Middleware Tenant subdomain [LMSK-12]
  └── Infrastructure AWS ca-central-1 (Terraform)

Sprint 02 (2026-03-13 → 03-27) : Core Backend
  ├── Module User (CRUD + rôles + Loi 25 endpoints)
  ├── Module Course (création, publication, SCORM import)
  ├── Module Enrollment (inscription, prérequis, certificats)
  ├── Module Consent (Loi 25 — collecte, révocation, export)
  ├── Package @lms/audit (hash chain SHA-256)
  └── Module Notification (SES + in-app + webhooks)

Sprint 03 (2026-03-28 → 04-11) : Frontend
  ├── Design system (Radix UI + Tailwind, Storybook)
  ├── Dashboard LEARNER
  ├── Dashboard INSTRUCTOR
  ├── Dashboard TENANT_ADMIN
  ├── Module Assessment Frontend
  └── Page Consentement Loi 25

Sprint 04 (2026-04-12 → 04-26) : Intégrations + CI Complet
  ├── SCORM 1.2 / 2004 player
  ├── SSO SAML2 (Keycloak IdP fédéré)
  ├── Plugin system KernelModule
  ├── Gate CI WCAG axe-core (bloquante)
  ├── Gate CI couverture tests (bloquante)
  └── Environnement staging AWS

Sprint 05 (2026-04-27 → 05-11) : Beta Interne
  ├── Onboarding tenant pilote (institution québécoise)
  ├── Pentest interne (OWASP ZAP + Burp)
  ├── Load tests k6 (100 req/s × 10 tenants)
  └── Rapport conformité Loi 25 (Isabelle Chen)

Sprint 06 (2026-05-12 → 05-26) : Release Candidate
  ├── Tag v1.0.0-rc.1
  ├── Runbook opérationnel
  ├── Test PRA (RTO < 4h, RPO < 1h)
  ├── Audit final Loi 25 + WCAG
  └── Go/No-go meeting (Alexandra Dupont)

Go-live : 2026-06-01
  └── Production AWS ca-central-1, 2-3 tenants actifs
```

### 9.2 Phase 2 — Extensions (Q3-Q4 2026)

- **IA/ML — Recommandations de cours** : Pipeline Amazon SageMaker (ca-central-1) pour recommandations personnalisées basées sur la progression et les préférences de l'apprenant. Modèle collaborative filtering + content-based. Consentement Loi 25 spécifique au profilage.
- **Application mobile** : React Native (Expo), partage de 80 % du code métier avec le frontend Next.js via une bibliothèque partagée `@lms/core-ui`. Support offline avec synchronisation différée.
- **Module Collaboration** : Forums de discussion par cours (modération assistée IA), salles de travail synchrones intégrées (API Teams/Zoom — hors scope v1.0), annotation collaborative de documents PDF.
- **Marketplace de Plugins** : Registre public de KernelModules tiers, validation de sécurité par Diofevre avant publication, modèle de revenus partage 70/30.

### 9.3 Phase 3 — Microservices et Internationalisation (2027-2028)

- **Décomposition microservices** : Extraction progressive selon le strangler fig pattern, en commençant par `auth-service` et `consent-service` (les plus indépendants)
- **Message broker** : Migration de l'EventEmitter2 interne vers AWS MSK (Kafka managé) pour la communication inter-services
- **Multi-région** : Expansion vers AWS us-east-1 (marché américain francophone — Louisiane, Franco-Américains) avec conformité FERPA, et eu-west-3 Paris (marché français — RGPD natif)
- **Internationalisation** : Support de l'anglais, du français québécois, du français de France, et de l'espagnol (marché hispanique canadien)

---

## 10. Risques Techniques

| # | Risque | Probabilité | Impact | Mitigation technique |
|---|--------|-------------|--------|---------------------|
| RT1 | **Bug d'isolation RLS** : Une requête Prisma mal construite contourne la politique RLS (paramètre `tenantId` non injecté) | Moyenne | Critique | Middleware Prisma obligatoire qui injecte `SET app.current_tenant` avant chaque requête ; tests d'isolation inter-tenant automatisés dans chaque suite d'intégration ; revue obligatoire de Thomas Martin sur tout changement de schéma ou de requête Prisma |
| RT2 | **Token Keycloak compromis** : Exfiltration d'un access_token valide | Faible | Élevé | Durée de vie access_token limitée à 5 minutes ; claim `tenant_id` vérifié côté applicatif (double validation) ; blacklist des tokens révoqués dans Redis ; TLS partout |
| RT3 | **Performance RLS sous charge** : La politique RLS ajoute une latence non négligeable sur les requêtes complexes | Moyenne | Moyen | Index composites `(tenant_id, id)` sur toutes les tables ; EXPLAIN ANALYZE systématique sur les requêtes générées par Prisma ; query plan reviewer dans CI (pganalyze) |
| RT4 | **Rupture de la chaîne d'audit** : Un bug dans `@lms/audit` provoque une discontinuité de la chaîne SHA-256 | Faible | Critique | Tests de régression 10 000 events ; couverture package ≥ 95 % ; écriture via BullMQ avec retry (pas d'écriture directe à l'API) ; monitoring Datadog sur le hash de la dernière entrée |
| RT5 | **Dette technique accumulée** : La pression des délais pousse à des raccourcis architecturaux qui fragilisent la base pour la Phase 2 | Élevée | Moyen | Budget de 20 % du temps de chaque sprint réservé au remboursement de dette technique ; ADR obligatoire pour tout écart à l'architecture cible ; revue de dette en rétrospective |
| RT6 | **Incompatibilité SCORM 2004** : Certains packages SCORM produits par des outils d'authoring tiers ne respectent pas strictement la norme | Moyenne | Moyen | Suite de 10 packages SCORM de référence (générés par Articulate Storyline, Adobe Captivate, iSpring) testés en CI ; librairie `scorm-again` maintenue activement |
| RT7 | **Prolifération de tenants Keycloak** : Chaque tenant a son propre Realm Keycloak — la gestion de 100+ realms devient complexe | Faible | Moyen | Provisionnement Realm automatisé via Keycloak Admin REST API au moment de la création du tenant ; configuration Realm as Code stockée dans git (Terraform Keycloak provider) |
| RT8 | **Vulnérabilité dans une dépendance NPM** | Élevée | Variable | `npm audit` dans CI (bloquant sur HIGH/CRITICAL) ; `dependabot` pour les mises à jour automatiques de sécurité ; inventaire SBoM (Software Bill of Materials) généré à chaque build |

---

> Document versionné et archivé dans le repo GitHub de Diofevre : https://github.com/Diofevre/lms-kernel/docs/technical-vision-v1.0.md
> Référence Jira : LMSK — Epic LMSK-2 (Architecture & Technical Foundation)
> Prochaine révision prévue : 2026-05-12 (avant Sprint 06, intégration des retours de la beta interne)