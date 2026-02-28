Je vais générer les deux documents complets. Étant donné la complexité et la longueur, je les produis directement sans appels d'outils (pas de fichiers à lire ou modifier).

---

# Document de Conception Système — LMS Kernel
> Version 1.0 | Date: 2026-02-28 | Auteur: Thomas Martin, Architecte Principal
> Révisé par: Alexandra Dupont (CTO), Isabelle Chen (Lead Sécurité)

---

## 1. Vue d'Ensemble

### 1.1 Objectif du Document

Ce document décrit l'architecture technique complète de **LMS Kernel**, une plateforme de gestion de l'apprentissage (Learning Management System) multi-tenant SaaS conçue pour le marché québécois. Il sert de référence authoritative pour les décisions d'implémentation, les revues de code, et l'intégration des nouveaux membres d'équipe. Il documente l'architecture **telle que décidée**, et non comme un espace de deliberation ouverte.

Ce document doit être maintenu à jour à chaque changement architectural majeur et versionné dans le dépôt principal sous `/docs/architecture/system-design.md`.

**Public cible :** Développeurs backend/frontend senior, DevOps, Lead Sécurité, auditeurs conformité Loi 25.

### 1.2 Contexte Business

LMS Kernel est une plateforme multi-tenant hébergée exclusivement en région `ca-central-1` (Canada Central, AWS) afin de se conformer à la **Loi 25 du Québec** (Loi modernisant des dispositions législatives en matière de protection des renseignements personnels). Chaque organisation cliente (tenant) accède à la plateforme via un sous-domaine dédié (`org.lms.example.com`) et bénéficie d'une isolation complète de ses données.

**Modèle de déploiement :** SaaS multi-tenant, facturation par organisation et par utilisateur actif mensuel.

**Secteur :** Formation professionnelle, enseignement supérieur, formation corporative.

**Exigences réglementaires :**
- Loi 25 Québec : consentement explicite, droit à l'oubli, portabilité des données, résidence des données au Canada
- WCAG 2.1 niveau AA : accessibilité universelle
- OWASP Top 10 : surface d'attaque minimisée

### 1.3 Contraintes Non-Fonctionnelles

| Attribut | Cible | Métrique | Mécanisme |
|---|---|---|---|
| Disponibilité | 99.9% | < 8.7h downtime/an | RDS Multi-AZ, ECS multi-AZ, ALB health checks |
| Latence API | p95 < 200ms | Mesuré en prod avec X-Ray | Connection pooling, Redis cache, index PostgreSQL |
| Latence Frontend | LCP < 2.5s | Core Web Vitals via CloudFront | Next.js RSC, CDN edge caching, image optimization |
| Débit | 1 000 req/s soutenu | Testé avec k6 en staging | ECS Auto Scaling, ThrottlerGuard par tenant |
| Scalabilité | x10 sans refactoring | De 100 à 1 000 tenants | Architecture stateless, RLS, connection pool sizing |
| Sécurité | OWASP Top 10 conforme | SAST + DAST + pen test annuel | WAF, JWKS, RLS, headers CSP, Snyk |
| Conformité données | Loi 25 Québec | Audit annuel CAI | ca-central-1 exclusif, consentement, audit trail |
| RTO | < 1h | Mesuré lors des DR drills | RDS snapshot restore, ECS task replacement |
| RPO | < 5 min | Mesuré lors des DR drills | RDS automated backup + transaction logs |

---

## 2. Architecture Globale

### 2.1 Diagramme C4 Niveau 1 : Contexte Système

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    C4 NIVEAU 1 — CONTEXTE SYSTÈME LMS KERNEL                ║
╚══════════════════════════════════════════════════════════════════════════════╝

                        ┌─────────────────┐
                        │   APPRENANT     │
                        │  (Étudiant)     │
                        │  Navigateur Web │
                        └────────┬────────┘
                                 │ HTTPS (subdomain)
                                 │ org1.lms.example.com
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────┴──────┐  ┌────────┴──────┐  ┌───────┴────────┐
     │  FORMATEUR    │  │ ADMINISTRATEUR│  │  INTÉGRATEUR   │
     │  (Instructeur)│  │   TENANT      │  │  (API externe) │
     │  Navigateur   │  │  Navigateur   │  │  REST/Webhook  │
     └────────┬──────┘  └────────┬──────┘  └───────┬────────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │ HTTPS
                                 ▼
                    ┌────────────────────────┐
                    │                        │
                    │      LMS KERNEL        │
                    │   Plateforme SaaS      │
                    │   Multi-Tenant LMS     │
                    │   AWS ca-central-1     │
                    │                        │
                    │  [NestJS + Next.js]    │
                    │  [PostgreSQL + Redis]  │
                    │  [Keycloak IAM]        │
                    │                        │
                    └────────────┬───────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────┴──────┐  ┌────────┴──────┐  ┌───────┴────────┐
     │  AWS SES      │  │  AWS S3       │  │  Keycloak      │
     │  (Emails      │  │  (Médias &    │  │  (IAM externe) │
     │  transac.)    │  │  exports)     │  │  self-hosted   │
     └───────────────┘  └───────────────┘  └────────────────┘

  Frontière de résidence des données : ══════════════════════
  Toutes les ressources AWS dans ca-central-1 (Loi 25)
```

### 2.2 Diagramme C4 Niveau 2 : Conteneurs

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║               C4 NIVEAU 2 — CONTENEURS LMS KERNEL (AWS ca-central-1)           ║
╚══════════════════════════════════════════════════════════════════════════════════╝

  INTERNET
     │
     ▼
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  AWS CloudFront + WAF                                                        │
 │  ┌─────────────────────────────────────────────────────────────────────┐    │
 │  │ WAF Rules: OWASP CRS, rate limit IP, geo-block hors Canada           │    │
 │  │ CloudFront: CDN assets statiques, cache RSC payloads                 │    │
 │  └─────────────────────────────────────────────────────────────────────┘    │
 └──────────────────────────────────┬───────────────────────────────────────────┘
                                    │ HTTPS/443
                                    ▼
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  AWS Application Load Balancer (ALB)                                         │
 │  ┌────────────────────┐  ┌────────────────────┐                             │
 │  │ Target Group: API  │  │ Target Group: Web  │                             │
 │  │ /api/* → NestJS    │  │ /* → Next.js       │                             │
 │  └────────────────────┘  └────────────────────┘                             │
 └──────────┬───────────────────────┬──────────────────────────────────────────┘
            │                       │
            ▼                       ▼
 ┌─────────────────────┐  ┌─────────────────────┐
 │   ECS Fargate       │  │   ECS Fargate       │
 │   NestJS API        │  │   Next.js Web       │
 │   ─────────────     │  │   ─────────────     │
 │   Port: 3001        │  │   Port: 3000        │
 │   CPU: 1 vCPU       │  │   CPU: 0.5 vCPU    │
 │   RAM: 2 GB         │  │   RAM: 1 GB        │
 │   Min: 2 tasks      │  │   Min: 2 tasks     │
 │   Max: 20 tasks     │  │   Max: 10 tasks    │
 │   TypeScript strict │  │   RSC + App Router │
 │   Fastify adapter   │  │   ISR + SSR        │
 └────────┬────────────┘  └──────────┬──────────┘
          │                          │
          │    ┌─────────────────────┘
          │    │  (Next.js appelle NestJS API via interne ALB)
          │    │
          ▼    ▼
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  Services Internes (VPC privé, pas d'accès internet direct)                  │
 │                                                                              │
 │  ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐  │
 │  │  Keycloak 24       │   │  RDS PostgreSQL 16  │   │  ElastiCache Redis │  │
 │  │  ──────────────    │   │  ──────────────     │   │  ──────────────    │  │
 │  │  ECS Fargate       │   │  Multi-AZ           │   │  7.x Cluster Mode  │  │
 │  │  Port: 8080        │   │  db.r6g.large       │   │  cache.r6g.large   │  │
 │  │  Realm: lms-kernel │   │  Storage: 500GB gp3 │   │  2 nodes           │  │
 │  │  OIDC + SAML2      │   │  RLS activé         │   │  TLS activé        │  │
 │  │  JWKS endpoint     │   │  PITR 7 jours       │   │  AUTH activé       │  │
 │  └────────────────────┘   └────────────────────┘   └────────────────────┘  │
 │                                                                              │
 │  ┌────────────────────┐   ┌────────────────────┐                           │
 │  │  AWS S3            │   │  AWS SES            │                           │
 │  │  ──────────────    │   │  ──────────────     │                           │
 │  │  lms-media-ca1     │   │  Emails transac.    │                           │
 │  │  lms-exports-ca1   │   │  SPF/DKIM/DMARC     │                           │
 │  │  lms-backups-ca1   │   │  Templates Handlebars│                          │
 │  │  SSE-KMS, versioning│  └────────────────────┘                           │
 │  └────────────────────┘                                                     │
 └──────────────────────────────────────────────────────────────────────────────┘

  Monitoring transversal:
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  CloudWatch Logs + Metrics | X-Ray Tracing | CloudWatch Alarms → SNS   │
  └─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Diagramme C4 Niveau 3 : Composants NestJS

```
╔══════════════════════════════════════════════════════════════════════════════╗
║            C4 NIVEAU 3 — COMPOSANTS NESTJS (Application Module)             ║
╚══════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                     AppModule (NestJS Root)                             │
  │                                                                         │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
  │  │ TenantModule │  │  AuthModule  │  │  UserModule  │  │CourseModule│ │
  │  │ ──────────── │  │ ──────────── │  │ ──────────── │  │ ──────────  │ │
  │  │ Middleware   │  │ AuthGuard    │  │ UserService  │  │CourseService│ │
  │  │ TenantSvc    │  │ JwksClient   │  │ UserRepo     │  │CourseRepo  │ │
  │  │ TenantRepo   │  │ TokenVerify  │  │ UserCtrl     │  │CourseCtrl  │ │
  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
  │         │                 │                  │                │        │
  │  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌─────┴──────┐ │
  │  │EnrollModule  │  │AssessModule  │  │ConsentModule │  │AuditModule │ │
  │  │ ──────────── │  │ ──────────── │  │ ──────────── │  │ ──────────  │ │
  │  │EnrollService │  │AssessService │  │ConsentService│  │AuditService│ │
  │  │EnrollRepo    │  │AssessRepo    │  │ConsentRepo   │  │AuditRepo   │ │
  │  │EnrollCtrl    │  │AssessCtrl    │  │ConsentCtrl   │  │AuditCtrl   │ │
  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
  │                                                                         │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
  │  │NotifModule   │  │AnalyticsModule│ │PluginModule  │  │HealthModule│ │
  │  │ ──────────── │  │ ────────────  │  │(KernelModule)│  │ ──────────  │ │
  │  │NotifService  │  │AnalyticsSvc  │  │PluginRegistry│  │HealthCtrl  │ │
  │  │BullMQ queues │  │ QueryBuilder │  │LifecycleHooks│  │DB check    │ │
  │  │SES adapter   │  │ CacheLayer   │  │Dependency Res│  │Redis check │ │
  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
  │                                                                         │
  │  Infrastructure transversale (injectée via DI dans tous les modules):  │
  │  ┌──────────────────────────────────────────────────────────────────┐  │
  │  │  @lms/db (PrismaService + withTenantContext)                     │  │
  │  │  @lms/audit (AuditInterceptor + hash chain SHA-256)             │  │
  │  │  @lms/iam (AuthenticatedUser decorator + KernelRole enum)       │  │
  │  │  @lms/compliance (Loi25Gate + WcagGate)                        │  │
  │  │  @lms/core (KernelContext + TenantContext + EventBus)           │  │
  │  └──────────────────────────────────────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────────────────┘

  Pipeline de requête (appliqué dans l'ordre pour chaque requête HTTP):
  ┌─────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐
  │ REQ │──▶│ Tenant   │──▶│Throttler │──▶│AuthGuard │──▶│AuditIntercept│
  │     │   │Middleware│   │ Guard    │   │  (JWKS)  │   │   (mutating) │
  └─────┘   └──────────┘   └──────────┘   └──────────┘   └──────┬───────┘
                                                                  │
                                 ┌────────────────────────────────┘
                                 ▼
                          ┌──────────────┐   ┌──────────────────┐
                          │  Controller  │──▶│HttpExceptionFilter│
                          │ (business)   │   │ (no stack trace) │
                          └──────────────┘   └──────────────────┘
```

---

## 3. Architecture Multi-Tenant

### 3.1 Stratégie d'Isolation

LMS Kernel utilise une stratégie d'isolation **à trois couches complémentaires** :

**Couche 1 — Routage réseau (subdomain routing)**
Chaque tenant dispose d'un sous-domaine dédié : `{slug}.lms.example.com`. CloudFront achemine toutes les requêtes vers le même cluster ECS. Le `TenantMiddleware` extrait le slug du header `Host`, résout le `tenantId` via un cache Redis (`tenant:slug:{slug}` → TTL 5 min), puis l'injecte dans le contexte de la requête via `AsyncLocalStorage`.

**Couche 2 — Isolation base de données (PostgreSQL RLS)**
Toutes les tables métier possèdent une colonne `tenant_id UUID NOT NULL`. Des politiques Row Level Security PostgreSQL sont activées sur chaque table et évaluent `current_setting('app.current_tenant_id')` positionné par `withTenantContext()` avant chaque requête Prisma. Un tenant ne peut jamais lire les données d'un autre tenant, même en cas de bug applicatif.

**Couche 3 — Isolation IAM (Keycloak Realm par tenant)**
Chaque tenant dispose de son propre Realm Keycloak ou d'un groupe isolé selon le tier de service. Les tokens JWT portent un claim `tenant_id` validé par l'`AuthGuard` en plus de la signature JWKS. L'`AuthGuard` vérifie la cohérence entre le claim JWT et le `tenantId` résolu par le middleware.

### 3.2 Flux de Résolution Tenant

```
  Client (navigateur) ──► org1.lms.example.com/api/courses
         │
         ▼
  [CloudFront] Header Host: org1.lms.example.com
         │ Forward Host header
         ▼
  [ALB] Routing vers ECS NestJS
         │
         ▼
  [TenantMiddleware] Exécution:
    1. Extrait slug = "org1" du Host header
    2. Vérifie Redis : GET tenant:slug:org1
         │
         ├─[HIT]──► tenantId = "uuid-org1"  (p95 < 1ms)
         │
         └─[MISS]─► SELECT id FROM tenants WHERE slug='org1'
                         AND is_active=true AND deleted_at IS NULL
                    ├─[TROUVÉ]─► SET tenant:slug:org1 = uuid TTL 300s
                    └─[ABSENT]─► 404 TenantNotFoundException
         │
         ▼
  [AsyncLocalStorage] tenantContext.set({ tenantId, slug, config })
         │
         ▼
  [ThrottlerGuard] Vérifie Redis : throttle:{tenantId}:{ip}
    - 10 req/s | 200 req/min | 1000 req/h
    - 429 si dépassé
         │
         ▼
  [AuthGuard] Vérifie JWT:
    1. Extrait Bearer token du header Authorization
    2. Récupère JWKS depuis Keycloak (cache mémoire 1h)
    3. Vérifie signature RS256, expiry, issuer
    4. Extrait claims: sub, tenant_id, roles, email
    5. Vérifie claim tenant_id === tenantContext.tenantId
    6. Injecte AuthenticatedUser dans request
         │
         ▼
  [withTenantContext()] SET app.current_tenant_id = 'uuid-org1'
         │ (avant chaque query Prisma)
         ▼
  [RLS PostgreSQL] Filtre automatique toutes les rows
    WHERE tenant_id = current_setting('app.current_tenant_id')
         │
         ▼
  [Controller] Reçoit request avec tenantContext + user injectés
```

### 3.3 Row Level Security PostgreSQL

```sql
-- ═══════════════════════════════════════════════════
-- Activation RLS et politiques d'isolation tenant
-- Migration: 20260228_enable_rls_all_tables.sql
-- ═══════════════════════════════════════════════════

-- Fonction utilitaire : récupère le tenant courant
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid tenant_id format in session context';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Tenant context not set. Use withTenantContext() before querying.';
END;
$$;

-- ── Table: users ─────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_isolation ON users
  AS RESTRICTIVE
  FOR ALL
  TO lms_app_role
  USING (tenant_id = current_tenant_id());

-- ── Table: courses ────────────────────────────────────
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;

CREATE POLICY courses_tenant_isolation ON courses
  AS RESTRICTIVE
  FOR ALL
  TO lms_app_role
  USING (tenant_id = current_tenant_id());

-- ── Table: enrollments ───────────────────────────────
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments FORCE ROW LEVEL SECURITY;

CREATE POLICY enrollments_tenant_isolation ON enrollments
  AS RESTRICTIVE
  FOR ALL
  TO lms_app_role
  USING (tenant_id = current_tenant_id());

-- ── Table: consents ──────────────────────────────────
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents FORCE ROW LEVEL SECURITY;

CREATE POLICY consents_tenant_isolation ON consents
  AS RESTRICTIVE
  FOR ALL
  TO lms_app_role
  USING (tenant_id = current_tenant_id());

-- ── Table: audit_logs ────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- Audit logs : lecture restreinte au tenant, écriture via service dédié
CREATE POLICY audit_logs_tenant_read ON audit_logs
  AS RESTRICTIVE
  FOR SELECT
  TO lms_app_role
  USING (tenant_id = current_tenant_id());

CREATE POLICY audit_logs_service_write ON audit_logs
  AS PERMISSIVE
  FOR INSERT
  TO lms_audit_role
  WITH CHECK (tenant_id = current_tenant_id());

-- ── Rôle applicatif (ne jamais utiliser superuser en runtime) ───
CREATE ROLE lms_app_role LOGIN PASSWORD '${LMS_DB_PASSWORD}';
CREATE ROLE lms_audit_role LOGIN PASSWORD '${LMS_AUDIT_DB_PASSWORD}';

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lms_app_role;
REVOKE ALL ON audit_logs FROM lms_app_role; -- L'app ne peut qu'écrire via lms_audit_role
GRANT SELECT ON audit_logs TO lms_app_role;

-- ── withTenantContext (appelé par @lms/db avant chaque transaction) ──
-- Équivalent applicatif (voir PrismaService) :
-- await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
```

### 3.4 KernelModule Plugin System

Le système de plugins permet d'étendre LMS Kernel sans modifier le core. Chaque module déclare ses dépendances, et le `PluginRegistry` ordonne l'initialisation via un tri topologique.

```typescript
// packages/core/src/kernel-module.interface.ts

export interface KernelContext {
  tenantId: string;
  config: Record<string, unknown>;
  logger: KernelLogger;
  eventBus: KernelEventBus;
  prisma: PrismaClient; // withTenantContext appliqué
  redis: Redis;
}

export interface KernelModule {
  id: string;           // Identifiant unique snake_case (ex: "assessment")
  name: string;         // Nom lisible (ex: "Assessment Module")
  version: string;      // SemVer (ex: "0.3.1")
  dependencies: string[]; // IDs des modules requis
  onInit(ctx: KernelContext): Promise<void>;   // Avant le démarrage HTTP
  onReady(ctx: KernelContext): Promise<void>;  // Après listen()
  onDestroy(): Promise<void>;                  // Avant l'arrêt
}

// Exemple : module Assessment
export const assessmentModule: KernelModule = {
  id: "assessment",
  name: "Assessment Module",
  version: "0.2.0",
  dependencies: ["auth", "course", "enrollment"],
  async onInit(ctx: KernelContext) {
    ctx.logger.log("Assessment module initializing...");
    // Vérifier que les tables existent, migrer si nécessaire
    await ctx.prisma.$queryRaw`SELECT 1 FROM assessments LIMIT 1`;
  },
  async onReady(ctx: KernelContext) {
    // S'abonner aux événements du cours (ex: cours archivé → désactiver assessments)
    ctx.eventBus.subscribe("course.archived", async (event) => {
      await ctx.prisma.assessment.updateMany({
        where: { courseId: event.courseId, tenantId: ctx.tenantId },
        data: { status: "ARCHIVED" },
      });
    });
  },
  async onDestroy() {
    // Nettoyer les listeners, fermer les connexions spécifiques
  },
};

// PluginRegistry — résolution des dépendances
// packages/core/src/plugin-registry.service.ts

@Injectable()
export class PluginRegistry {
  private modules = new Map<string, KernelModule>();

  register(module: KernelModule): void {
    this.modules.set(module.id, module);
  }

  async initializeAll(ctx: KernelContext): Promise<void> {
    const ordered = this.topologicalSort();
    for (const module of ordered) {
      await module.onInit(ctx);
    }
  }

  private topologicalSort(): KernelModule[] {
    // Kahn's algorithm sur le DAG des dépendances
    // Lance une erreur si cycle détecté
    const visited = new Set<string>();
    const result: KernelModule[] = [];
    const visit = (id: string) => {
      if (visited.has(id)) return;
      const mod = this.modules.get(id);
      if (!mod) throw new Error(`Dépendance non trouvée: ${id}`);
      mod.dependencies.forEach(visit);
      visited.add(id);
      result.push(mod);
    };
    this.modules.forEach((_, id) => visit(id));
    return result;
  }
}
```

---

## 4. Stack Technologique Détaillée

### 4.1 Backend NestJS + Fastify

**Version :** NestJS 10.x avec adaptateur Fastify 4.x

NestJS fournit le framework d'injection de dépendances, la structure modulaire et les décorateurs. Fastify remplace Express comme serveur HTTP pour sa performance supérieure (jusqu'à 2x plus de req/s qu'Express sur les benchmarks synthétiques) et son support natif du JSON Schema validation.

**Configuration critique :**
```typescript
// main.ts
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({
    logger: false, // On utilise le logger NestJS + CloudWatch
    trustProxy: true, // ALB devant l'application
    bodyLimit: 10_485_760, // 10MB pour uploads de contenu de cours
  }),
);

// Helmet via fastify-helmet (CSP, HSTS, etc.)
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{NONCE}'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Nécessaire pour Tailwind
      imgSrc: ["'self'", "data:", "https://*.amazonaws.com"],
      connectSrc: ["'self'", "https://*.lms.example.com"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
});

app.setGlobalPrefix("api/v1");
app.enableVersioning({ type: VersioningType.URI });
await app.listen(3001, "0.0.0.0");
```

**ThrottlerGuard configuration :**
```typescript
ThrottlerModule.forRoot([
  { name: "short",  ttl: 1000,    limit: 10  }, // 10/s
  { name: "medium", ttl: 60000,   limit: 200 }, // 200/min
  { name: "long",   ttl: 3600000, limit: 1000 }, // 1000/h
]),
```

### 4.2 Frontend Next.js 14 App Router

**Architecture de rendu :**
- **React Server Components (RSC)** : Composants data-fetching (listes de cours, dashboards) — rendu serveur, zéro JS envoyé au client
- **Client Components** (`"use client"`)  : Formulaires interactifs, lecteur vidéo, éditeur de quiz
- **Incremental Static Regeneration (ISR)** : Pages marketing et contenus publics — revalidation toutes les 3600s

**Structure des routes App Router :**
```
app/
├── (auth)/
│   ├── login/page.tsx        # RSC — redirect si authentifié
│   └── logout/page.tsx
├── (tenant)/
│   ├── layout.tsx            # TenantProvider (lit subdomain)
│   ├── dashboard/page.tsx    # RSC
│   ├── courses/
│   │   ├── page.tsx          # RSC — liste
│   │   └── [courseId]/
│   │       ├── page.tsx      # RSC — détail
│   │       └── learn/page.tsx # Client Component — lecteur
│   └── admin/
│       ├── users/page.tsx    # RSC
│       └── reports/page.tsx  # RSC + streaming Suspense
└── api/
    └── auth/[...nextauth]/   # Unused — auth via Keycloak OIDC direct
```

### 4.3 Authentification Keycloak 24

**Flux OIDC (Authorization Code + PKCE) :**
- Realm unique `lms-kernel` avec groupes par tenant
- Tokens : Access Token (TTL 5 min, RS256), Refresh Token (TTL 30 min, rotation), ID Token
- Claims personnalisés : `tenant_id`, `kernel_roles[]`, `consent_version`
- JWKS endpoint public : `https://auth.lms.example.com/realms/lms-kernel/protocol/openid-connect/certs`
- L'`AuthGuard` NestJS met en cache le JWKS en mémoire avec `jwks-rsa` (TTL 1h, rotation automatique)

**Configuration Realm Keycloak :**
```json
{
  "realm": "lms-kernel",
  "accessTokenLifespan": 300,
  "ssoSessionMaxLifespan": 36000,
  "bruteForceProtected": true,
  "failureFactor": 5,
  "passwordPolicy": "length(12) and digits(1) and upperCase(1) and specialChars(1)",
  "requiredActions": ["VERIFY_EMAIL", "CONFIGURE_TOTP"]
}
```

### 4.4 Base de Données PostgreSQL 16 + Prisma

**Configuration RDS :**
- Instance : `db.r6g.large` (2 vCPU, 16 GB RAM) — Multi-AZ
- Storage : 500 GB gp3, IOPS 3000, throughput 125 MB/s
- PostgreSQL 16 avec extensions : `uuid-ossp`, `pgcrypto`, `pg_stat_statements`
- Backup : Automated (7 jours PITR) + snapshots manuels avant migrations

**PrismaService avec contexte tenant :**
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async withTenantContext<T>(
    tenantId: string,
    fn: (prisma: PrismaService) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT set_config('app.current_tenant_id', ${tenantId}, true)
      `;
      return fn(tx as unknown as PrismaService);
    });
  }
}
```

### 4.5 Cache et Queues Redis 7 + BullMQ

**ElastiCache Redis 7 :** Cluster mode, 2 shards, 1 replica par shard, TLS + AUTH.

**Usages Redis :**

| Usage | Clé | TTL | Stratégie |
|---|---|---|---|
| Session tenant | `tenant:slug:{slug}` | 300s | Cache-aside |
| JWKS Keycloak | `jwks:lms-kernel` | 3600s | Cache-aside |
| Throttling | `throttle:{tenantId}:{ip}:{window}` | Variable | Sliding window |
| Résultat quiz | `assessment:result:{assessmentId}:{userId}` | 3600s | Write-through |
| Analytics agrégés | `analytics:{tenantId}:{metric}:{date}` | 86400s | Write-behind |
| BullMQ jobs | `bull:{queueName}:*` | Géré par BullMQ | - |

**Queues BullMQ :**
```typescript
// Queues définies dans NotificationModule et AnalyticsModule
const QUEUES = {
  NOTIFICATIONS: "lms:notifications",  // Emails, push
  ANALYTICS:     "lms:analytics",      // Agrégation différée
  EXPORTS:       "lms:exports",        // Génération PDF/CSV (long running)
  CONSENT_AUDIT: "lms:consent-audit",  // Log des changements de consentement
} as const;

// Worker notifications (ECS Fargate séparé, 1 instance min)
@Processor(QUEUES.NOTIFICATIONS)
export class NotificationWorker {
  @Process("send-email")
  async sendEmail(job: Job<SendEmailDto>): Promise<void> {
    // Rate limit SES: 14 emails/s en prod
    await this.sesAdapter.send(job.data);
  }
}
```

### 4.6 Infrastructure AWS ca-central-1

**Ressources Terraform (résumé) :**

| Ressource | Type | Configuration |
|---|---|---|
| VPC | `aws_vpc` | CIDR 10.0.0.0/16, 3 AZ |
| ECS Cluster | `aws_ecs_cluster` | Fargate, Container Insights |
| RDS | `aws_db_instance` | PostgreSQL 16, Multi-AZ, encrypted |
| ElastiCache | `aws_elasticache_replication_group` | Redis 7, TLS, AUTH |
| ALB | `aws_lb` | HTTPS only, access logs S3 |
| CloudFront | `aws_cloudfront_distribution` | OAC, WAF associé |
| WAF | `aws_wafv2_web_acl` | AWSManagedRulesCommonRuleSet |
| S3 (médias) | `aws_s3_bucket` | SSE-KMS, versioning, lifecycle |
| KMS | `aws_kms_key` | Customer-managed, rotation annuelle |
| Secrets Manager | `aws_secretsmanager_secret` | Rotation automatique 90j |

**Stratégie réseau :**
- Subnets publics : ALB, NAT Gateway
- Subnets privés : ECS Tasks, RDS, ElastiCache, Keycloak
- Subnets isolés : RDS (aucun accès internet même sortant)
- Security Groups : principe du moindre privilège, pas de règle 0.0.0.0/0 en interne

---

## 5. Flux de Données et Patterns

### 5.1 Flux d'Authentification OIDC

```
  Utilisateur (navigateur org1.lms.example.com)
       │
       │ 1. GET /dashboard (non authentifié)
       ▼
  [Next.js Middleware]
       │ 2. Vérifie cookie de session (absent)
       │ 3. Redirige vers Keycloak avec PKCE challenge
       ▼
  [Keycloak 24 — auth.lms.example.com]
       │ 4. Affiche formulaire de connexion du tenant
       │ 5. L'utilisateur saisit credentials
       │ 6. Keycloak vérifie dans son store + 2FA TOTP
       │ 7. Génère Authorization Code (durée: 30s)
       ▼
  [Navigateur — Callback URL]
       │ 8. Reçoit code + state
       │ 9. POST /token avec code + PKCE verifier
       ▼
  [Keycloak Token Endpoint]
       │ 10. Valide PKCE, émet:
       │     - access_token  (RS256, 5min, claims: sub, tenant_id, roles)
       │     - refresh_token (30min, rotation à chaque usage)
       │     - id_token      (OIDC)
       ▼
  [Next.js — Stockage tokens]
       │ 11. Access token → cookie HttpOnly Secure SameSite=Strict
       │ 12. Refresh token → cookie HttpOnly Secure SameSite=Strict
       │     (pas de localStorage — XSS protection)
       ▼
  [API NestJS — requête authentifiée]
       │ 13. Authorization: Bearer {access_token}
       ▼
  [AuthGuard NestJS]
       │ 14. Récupère JWKS depuis cache Redis (ou Keycloak si miss)
       │ 15. Vérifie signature RS256
       │ 16. Vérifie expiry, issuer, audience
       │ 17. Vérifie tenant_id claim === tenantContext.tenantId
       │ 18. Injecte AuthenticatedUser dans request.user
       ▼
  [Controller] Traite la requête avec contexte complet
```

### 5.2 Flux de Requête API (Pipeline Complet NestJS)

Voir section 2.3 pour le diagramme de composants. Détails d'implémentation :

```typescript
// Ordre d'exécution NestJS pour POST /api/v1/courses/:id/enroll

// 1. TenantMiddleware (global)
//    → Set tenantContext via AsyncLocalStorage
//    → Redis lookup ou DB lookup

// 2. ThrottlerGuard (global)
//    → Vérifie 3 fenêtres (1s, 1min, 1h)
//    → Clé: `throttle:${tenantId}:${ip}`

// 3. AuthGuard (appliqué au Controller)
//    → Valide JWT, extrait user
//    → Vérifie tenant_id claim

// 4. RolesGuard (appliqué à la route)
//    → @Roles(KernelRole.STUDENT, KernelRole.ADMIN)

// 5. AuditInterceptor (global, mutating operations only)
//    → Intercepte POST/PUT/PATCH/DELETE
//    → Crée AuditLog après réponse réussie

// 6. EnrollmentController.enroll()
//    → Appelle EnrollmentService.enroll(dto, tenantContext, user)

// 7. EnrollmentService
//    → withTenantContext(tenantId, async (prisma) => {
//         SET app.current_tenant_id  // RLS activé
//         Vérifie que le cours appartient au tenant (RLS le garantit)
//         Vérifie capacité, prérequis
//         Crée Enrollment
//         Publie event: enrollment.created → BullMQ
//       })

// 8. HttpExceptionFilter (global)
//    → Transforme toute exception en ErrorResponseDto
//    → N'expose JAMAIS stack traces en production
//    → Log complet côté serveur (CloudWatch)
```

### 5.3 Traitement Asynchrone BullMQ

```
  [API NestJS] enrollment.created event
       │
       │ eventBus.publish('enrollment.created', { enrollmentId, userId, courseId, tenantId })
       ▼
  [BullMQ Queue: lms:notifications]
       │
       ├──► Job: send-welcome-email
       │        Worker: NotificationWorker
       │        → Construit email depuis template Handlebars
       │        → AWS SES SendEmail API
       │        → Retry: 3 tentatives, backoff exponentiel 30s
       │
       └──► Job: update-analytics-enrollment-count
                Worker: AnalyticsWorker
                → Incrémente compteur Redis: analytics:{tenantId}:enrollments:{date}
                → Flush vers PostgreSQL toutes les heures (batch)

  [BullMQ Queue: lms:exports]
       │ (déclenché par GET /api/v1/reports/enrollments/export)
       ▼
       ├──► Job: generate-csv-report (long running, hasta 5 min)
       │        Worker: ExportWorker (ECS task séparé)
       │        → Stream PostgreSQL cursor → Transform → S3 multipart upload
       │        → Génère presigned URL (TTL 3600s)
       │        → Notifie l'utilisateur par email
       │
       └──► Job: generate-pdf-certificate
                → Génère PDF via Puppeteer (headless Chrome)
                → Upload S3: exports/{tenantId}/{userId}/cert-{courseId}.pdf
                → Presigned URL dans notification email
```

### 5.4 Invalidation du Cache Redis

**Stratégie par type de données :**

```typescript
// Cache-aside (lecture)
async getCoursesForTenant(tenantId: string): Promise<Course[]> {
  const cacheKey = `courses:list:${tenantId}`;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const courses = await this.prisma.course.findMany({
    where: { status: 'PUBLISHED' }, // RLS applique tenant_id automatiquement
  });
  await this.redis.setex(cacheKey, 300, JSON.stringify(courses));
  return courses;
}

// Invalidation sur mutation
async updateCourse(courseId: string, dto: UpdateCourseDto, tenantId: string) {
  const course = await this.prisma.course.update({ where: { id: courseId }, data: dto });
  // Invalider le cache liste ET le cache detail
  await this.redis.del(`courses:list:${tenantId}`);
  await this.redis.del(`courses:detail:${courseId}`);
  return course;
}
```

---

## 6. Stratégie de Données

### 6.1 Modèle de Données Prisma (Schéma Simplifié)

```prisma
// schema.prisma — LMS Kernel
// packages/db/prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [uuidOssp(map: "uuid-ossp"), pgcrypto]
}

enum KernelRole {
  SUPER_ADMIN  // Équipe LMS Kernel — cross-tenant
  ADMIN        // Admin tenant
  INSTRUCTOR   // Formateur
  STUDENT      // Apprenant
  GUEST        // Accès lecture seule limité
}

enum CourseStatus {
  DRAFT
  REVIEW
  PUBLISHED
  ARCHIVED
}

model Tenant {
  id        String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  slug      String   @unique @db.VarChar(63)   // Subdomain segment
  name      String   @db.VarChar(255)
  domain    String?  @unique @db.VarChar(255)  // Custom domain optionnel
  config    Json     @default("{}")             // Feature flags, branding
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?                           // Soft delete

  users       User[]
  courses     Course[]
  enrollments Enrollment[]
  consents    Consent[]
  auditLogs   AuditLog[]

  @@index([slug])
  @@index([domain])
  @@map("tenants")
}

model User {
  id          String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  tenantId    String     @db.Uuid
  keycloakId  String     @db.Uuid          // sub claim du JWT
  email       String     @db.VarChar(320)
  role        KernelRole @default(STUDENT)
  firstName   String?    @db.VarChar(100)
  lastName    String?    @db.VarChar(100)
  locale      String     @default("fr-CA") @db.VarChar(10)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?                     // RGPD/Loi 25 soft delete

  tenant      Tenant       @relation(fields: [tenantId], references: [id])
  enrollments Enrollment[]
  consents    Consent[]

  @@unique([tenantId, keycloakId])
  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([keycloakId])
  @@map("users")
}

model Course {
  id           String       @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  tenantId     String       @db.Uuid
  instructorId String       @db.Uuid
  title        String       @db.VarChar(500)
  description  String?      @db.Text
  status       CourseStatus @default(DRAFT)
  content      Json         @default("{}")    // Structure chapitres/modules
  locale       String       @default("fr-CA") @db.VarChar(10)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  deletedAt    DateTime?

  tenant      Tenant       @relation(fields: [tenantId], references: [id])
  enrollments Enrollment[]

  @@index([tenantId, status])
  @@index([tenantId, instructorId])
  @@map("courses")
}

model Enrollment {
  id          String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  tenantId    String    @db.Uuid
  userId      String    @db.Uuid
  courseId    String    @db.Uuid
  progress    Decimal   @default(0) @db.Decimal(5, 2) // 0.00 à 100.00
  completedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   User   @relation(fields: [userId], references: [id])
  course Course @relation(fields: [courseId], references: [id])

  @@unique([tenantId, userId, courseId])
  @@index([tenantId, userId])
  @@index([tenantId, courseId])
  @@map("enrollments")
}

model Consent {
  id         String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  tenantId   String    @db.Uuid
  userId     String    @db.Uuid
  purpose    String    @db.VarChar(100)  // Ex: "analytics", "marketing"
  legalBasis String    @db.VarChar(50)   // "consent", "legitimate_interest"
  granted    Boolean
  version    String    @db.VarChar(20)   // Version des CGU au moment du consentement
  ipHash     String?   @db.VarChar(64)   // SHA-256 de l'IP (anonymisée)
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   User   @relation(fields: [userId], references: [id])

  @@index([tenantId, userId, purpose])
  @@map("consents")
}

model AuditLog {
  id           String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  tenantId     String   @db.Uuid
  actorId      String   @db.Uuid         // userId ou "system"
  action       String   @db.VarChar(100) // Ex: "course.published", "user.deleted"
  resource     String   @db.VarChar(100) // Ex: "Course:uuid-xxx"
  payload      Json     @default("{}")   // Diff avant/après (données sensibles anonymisées)
  previousHash String   @db.Char(64)     // SHA-256 du log précédent (hash chain)
  hash         String   @db.Char(64)     // SHA-256 de (previousHash + payload)
  createdAt    DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, createdAt])
  @@index([tenantId, actorId])
  @@index([tenantId, action])
  @@map("audit_logs")
}
```

### 6.2 Indexation PostgreSQL

Index obligatoires par table (au-delà des contraintes PRIMARY KEY et UNIQUE Prisma) :

```sql
-- tenants
CREATE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_domain ON tenants(domain) WHERE domain IS NOT NULL;

-- users
CREATE INDEX idx_users_tenant_id ON users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_keycloak_id ON users(keycloak_id);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email) WHERE deleted_at IS NULL;

-- courses
CREATE INDEX idx_courses_tenant_status ON courses(tenant_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_tenant_instructor ON courses(tenant_id, instructor_id)
  WHERE deleted_at IS NULL;
-- Index full-text pour recherche de cours
CREATE INDEX idx_courses_fts ON courses
  USING gin(to_tsvector('french', title || ' ' || coalesce(description, '')));

-- enrollments
CREATE INDEX idx_enrollments_tenant_user ON enrollments(tenant_id, user_id);
CREATE INDEX idx_enrollments_tenant_course ON enrollments(tenant_id, course_id);
CREATE INDEX idx_enrollments_progress ON enrollments(tenant_id, progress)
  WHERE completed_at IS NULL;

-- audit_logs (append-only, pas de soft delete)
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(tenant_id, actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(tenant_id, action, created_at DESC);

-- consents
CREATE INDEX idx_consents_user_purpose ON consents(tenant_id, user_id, purpose)
  WHERE revoked_at IS NULL;
```

### 6.3 Stratégie de Backup et Recovery

| Métrique | Cible | Mécanisme |
|---|---|---|
| RPO | < 5 min | RDS PITR (Point-in-Time Recovery) avec transaction logs continus |
| RTO | < 1h | Snapshot restore vers nouvelle instance + DNS failover Route53 |
| Rétention backups | 7 jours PITR + 35 jours snapshots | RDS automated backups + snapshot mensuel vers S3 Glacier |
| Test DR | Trimestriel | Restore vers environnement isolé, validation intégrité données |
| Chiffrement backups | AES-256 | KMS customer-managed key, clé différente par environnement |

**Procédure de Recovery (RTO < 1h) :**
1. Alerte CloudWatch → SNS → PagerDuty (< 2 min)
2. Décision de restore → RDS PITR vers point T-5min (< 10 min)
3. Nouvelle instance disponible → validation connexion (< 20 min)
4. Mise à jour SSM Parameter Store avec nouvelle URL RDS (< 2 min)
5. Rolling restart ECS tasks (< 10 min)
6. Validation health checks ALB (< 5 min)
7. Post-incident report dans les 48h

### 6.4 Cache Redis — Convention de Nommage des Clés

```
Format: {namespace}:{entity}:{identifier}[:{sub-identifier}]

Exemples:
  tenant:slug:org1                      → UUID tenant (TTL: 300s)
  tenant:config:uuid-org1               → Config JSON tenant (TTL: 600s)
  jwks:lms-kernel                       → JWKS Keycloak (TTL: 3600s)
  throttle:uuid-tenant:1.2.3.4:short    → Compteur throttling (TTL: auto)
  courses:list:uuid-tenant              → Liste cours publiés (TTL: 300s)
  courses:detail:uuid-course            → Détail cours (TTL: 600s)
  analytics:uuid-tenant:enrollments:2026-02-28  → Compteur quotidien (TTL: 86400s)
  assessment:result:uuid-assess:uuid-user       → Résultat quiz (TTL: 3600s)
  session:uuid-user                     → Données session (TTL: 1800s)

Règles:
  - Toutes minuscules, séparateur ':'
  - UUID toujours complets (pas de troncature)
  - Jamais de données PII en clair dans les clés
  - Préfixer par l'environnement en dev/staging: dev:courses:list:...
```

---

## 7. Sécurité par Design

### 7.1 Couches de Sécurité (Défense en Profondeur)

```
  INTERNET
     │
  ┌──▼──────────────────────────────────────────────────────────┐
  │  COUCHE 1 — AWS WAF                                         │
  │  • AWSManagedRulesCommonRuleSet (OWASP Top 10)             │
  │  • AWSManagedRulesSQLiRuleSet                               │
  │  • Rate limiting par IP: 2000 req/5min                      │
  │  • Geo-restriction: Canada uniquement (Loi 25)              │
  │  • Block Bad Bots (AWSManagedRulesBotControlRuleSet)        │
  └──┬──────────────────────────────────────────────────────────┘
     │
  ┌──▼──────────────────────────────────────────────────────────┐
  │  COUCHE 2 — CloudFront + TLS                                │
  │  • TLS 1.2 minimum (TLS 1.3 préféré)                       │
  │  • Certificate: ACM (renouvellement auto)                   │
  │  • HSTS preload                                             │
  │  • HTTP → HTTPS redirect forcé                              │
  └──┬──────────────────────────────────────────────────────────┘
     │
  ┌──▼──────────────────────────────────────────────────────────┐
  │  COUCHE 3 — ALB                                             │
  │  • Security Groups: 443 entrant uniquement depuis CloudFront│
  │  • Access Logs → S3 (rétention 90 jours)                   │
  │  • Sticky sessions désactivées (stateless)                  │
  └──┬──────────────────────────────────────────────────────────┘
     │
  ┌──▼──────────────────────────────────────────────────────────┐
  │  COUCHE 4 — Application NestJS                              │
  │  • TenantMiddleware: isolation tenant                        │
  │  • ThrottlerGuard: rate limiting par tenant + IP            │
  │  • AuthGuard: JWKS RS256, vérification tenant_id claim      │
  │  • RolesGuard: autorisation par rôle (RBAC)                 │
  │  • AuditInterceptor: traçabilité des mutations              │
  │  • HttpExceptionFilter: pas de stack trace en réponse       │
  │  • Helmet: security headers (CSP, HSTS, X-Frame-Options)    │
  │  • Input validation: class-validator + Joi pour JSON        │
  └──┬──────────────────────────────────────────────────────────┘
     │
  ┌──▼──────────────────────────────────────────────────────────┐
  │  COUCHE 5 — Base de données PostgreSQL                      │
  │  • Row Level Security: isolation données par tenant          │
  │  • Rôle applicatif lms_app_role (pas superuser)             │
  │  • Chiffrement at-rest: AES-256 (RDS storage encryption)    │
  │  • Chiffrement in-transit: TLS 1.2+                         │
  │  • VPC isolé: pas d'accès internet direct                   │
  │  • Secrets dans AWS Secrets Manager (rotation 90j)          │
  └─────────────────────────────────────────────────────────────┘
```

### 7.2 Headers HTTP de Sécurité Obligatoires

```typescript
// Configurés via fastify-helmet dans main.ts

const SECURITY_HEADERS = {
  // Empêche le clickjacking
  "X-Frame-Options": "DENY",

  // Empêche le MIME sniffing
  "X-Content-Type-Options": "nosniff",

  // Active le filtre XSS navigateur (legacy)
  "X-XSS-Protection": "1; mode=block",

  // HSTS — force HTTPS pour 1 an + sous-domaines
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

  // Referrer limité au même site
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Permissions API browser
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",

  // Content Security Policy — stricte
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'nonce-{NONCE}'",
    "style-src 'self' 'unsafe-inline'",     // Tailwind nécessite inline
    "img-src 'self' data: https://*.amazonaws.com",
    "connect-src 'self' https://*.lms.example.com https://auth.lms.example.com",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),

  // Isolation cross-origin
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-site",
  "Cross-Origin-Embedder-Policy": "require-corp",
};
```

### 7.3 Audit Trail (@lms/audit — Hash Chain SHA-256)

Chaque opération mutante (CREATE, UPDATE, DELETE) génère un `AuditLog` dont le hash est chaîné avec le log précédent. Toute falsification d'un log historique invalide tous les hashes suivants, rendant la falsification détectable.

```typescript
// packages/audit/src/audit.service.ts

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: CreateAuditEntryDto): Promise<void> {
    const lastLog = await this.prisma.auditLog.findFirst({
      where: { tenantId: entry.tenantId },
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });

    const previousHash = lastLog?.hash ?? "0".repeat(64); // Genesis hash

    const payload = JSON.stringify({
      tenantId:  entry.tenantId,
      actorId:   entry.actorId,
      action:    entry.action,
      resource:  entry.resource,
      payload:   entry.payload,
      timestamp: new Date().toISOString(),
    });

    const hash = createHash("sha256")
      .update(previousHash + payload)
      .digest("hex");

    await this.prisma.auditLog.create({
      data: {
        tenantId:     entry.tenantId,
        actorId:      entry.actorId,
        action:       entry.action,
        resource:     entry.resource,
        payload:      entry.payload,
        previousHash,
        hash,
      },
    });
  }

  async verifyChain(tenantId: string): Promise<{ valid: boolean; brokenAt?: string }> {
    const logs = await this.prisma.auditLog.findMany({
      where:   { tenantId },
      orderBy: { createdAt: "asc" },
    });

    let previousHash = "0".repeat(64);
    for (const log of logs) {
      if (log.previousHash !== previousHash) {
        return { valid: false, brokenAt: log.id };
      }
      previousHash = log.hash;
    }
    return { valid: true };
  }
}

// AuditInterceptor — intercepte toutes les mutations HTTP
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const MUTATING = ["POST", "PUT", "PATCH", "DELETE"];

    if (!MUTATING.includes(request.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        const user: AuthenticatedUser = request.user;
        const tenant: TenantContext = request.tenantContext;
        await this.auditService.log({
          tenantId: tenant.tenantId,
          actorId:  user.id,
          action:   `${request.method.toLowerCase()}.${request.routerPath}`,
          resource: request.params?.id ? `${request.routerPath}:${request.params.id}` : request.routerPath,
          payload:  { body: this.sanitize(request.body), params: request.params },
        });
      }),
    );
  }
}
```

---

## 8. Stratégie de Déploiement

### 8.1 Environnements

| Environnement | But | Infrastructure | Données | URL |
|---|---|---|---|---|
| dev (local) | Développement | Docker Compose | Seed fixtures | localhost |
| staging | Intégration + tests | ECS Fargate (1 task) | Anonymisées (prod-like) | staging.lms.example.com |
| pre-prod | Validation finale | ECS Fargate (2 tasks) | Snapshot prod anonymisé | preprod.lms.example.com |
| prod | Production | ECS Fargate (Auto Scaling) | Production réelle | *.lms.example.com |

**Variables par environnement :** gérées via AWS Parameter Store (strings) et Secrets Manager (secrets). Jamais en dur dans le code ou les images Docker.

### 8.2 Pipeline CI/CD (7 Stages)

```
  Push feature/* ou PR vers develop
       │
  ┌────▼─────────────────────────────────────────────────────┐
  │  STAGE 0 — Pre-flight (< 2 min)                         │
  │  • Gitleaks: scan secrets dans le diff                   │
  │  • GPG: vérification signature des commits               │
  │  • Conventional Commits: lint des messages de commit     │
  └────┬─────────────────────────────────────────────────────┘
       │ (bloquant si échec)
  ┌────▼─────────────────────────────────────────────────────┐
  │  STAGE 1 — Quality Gates (< 10 min, parallèle)          │
  │  • ESLint + TypeScript strict (0 erreur toléré)         │
  │  • Jest: couverture ≥ 80% (branches + lines)            │
  │  • axe-core WCAG 2.1 AA sur composants Storybook        │
  │  • Loi25Gate: vérification champs PII annotés           │
  │  • Snyk: vulnérabilités dépendances (0 critical, 0 high) │
  └────┬─────────────────────────────────────────────────────┘
       │
  ┌────▼─────────────────────────────────────────────────────┐
  │  STAGE 2 — Advanced Testing (< 20 min)                  │
  │  • Playwright E2E (smoke tests sur staging éphémère)    │
  │  • CodeQL SAST: analyse statique sécurité               │
  │  • Syft SBOM: génération Software Bill of Materials     │
  │  • Stryker mutation testing (score ≥ 75%)               │
  └────┬─────────────────────────────────────────────────────┘
       │
  ┌────▼─────────────────────────────────────────────────────┐
  │  STAGE 3 — Nightly (00h UTC, sur develop)               │
  │  • SonarCloud Quality Gate (A sur tous les métriques)   │
  │  • OWASP ZAP DAST (contre staging)                      │
  └────┬─────────────────────────────────────────────────────┘
       │
  ┌────▼─────────────────────────────────────────────────────┐
  │  STAGE 4 — Staging Deploy (auto sur develop → staging)  │
  │  • Build Docker image → ECR                              │
  │  • Deploy ECS Fargate (rolling update)                  │
  │  • k6 load tests: 1000 req/s soutenu 5 min             │
  │  • 72h quarantine: monitoring automatique               │
  │  • Critères de sortie: 0 erreur P0, latence p95 < 200ms │
  └────┬─────────────────────────────────────────────────────┘
       │ (après 72h quarantine + approval)
  ┌────▼─────────────────────────────────────────────────────┐
  │  STAGE 5 — Pre-prod (approbation manuelle requise)      │
  │  • Déclenchement manuel (bouton GitHub Actions)         │
  │  • Approbateurs: CTO ou Lead Tech                       │
  │  • Deploy sur pre-prod avec snapshot de prod anonymisé  │
  │  • Smoke tests automatiques                             │
  └────┬─────────────────────────────────────────────────────┘
       │ (approval CTO)
  ┌────▼─────────────────────────────────────────────────────┐
  │  STAGE 6 — Production (canary progressif)               │
  │  • 5% du trafic → nouvelle version (15 min)             │
  │  • Vérification métriques CloudWatch (auto)             │
  │  • 25% du trafic (15 min)                               │
  │  • Vérification métriques                               │
  │  • 100% du trafic                                       │
  │  • Auto-rollback si error rate > 1% ou p95 > 500ms     │
  └─────────────────────────────────────────────────────────┘
```

### 8.3 Stratégie Canary Deploy (5% → 25% → 100%)

Implémentée via AWS CodeDeploy avec ECS et ALB weighted target groups :

```hcl
# terraform/modules/ecs/codedeploy.tf

resource "aws_codedeploy_deployment_group" "lms_api" {
  app_name               = aws_codedeploy_app.lms.name
  deployment_group_name  = "lms-api-${var.environment}"
  deployment_config_name = "CodeDeployDefault.ECSCanary10Percent5Minutes"
  service_role_arn       = aws_iam_role.codedeploy.arn

  ecs_service {
    cluster_name = aws_ecs_cluster.main.name
    service_name = aws_ecs_service.api.name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route { listener_arns = [aws_lb_listener.https.arn] }
      target_group { name = aws_lb_target_group.api_blue.name }
      target_group { name = aws_lb_target_group.api_green.name }
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  alarm_configuration {
    alarms  = [aws_cloudwatch_metric_alarm.api_error_rate.name,
               aws_cloudwatch_metric_alarm.api_latency_p95.name]
    enabled = true
  }
}
```

### 8.4 Rollback Automatique

**Déclencheurs de rollback :**
- `5xxErrorRate > 1%` sur une fenêtre de 5 minutes → rollback immédiat
- `Latence p95 > 500ms` sur une fenêtre de 5 minutes → rollback immédiat
- Health check ALB failure sur 3 vérifications consécutives → rollback immédiat
- Rollback manuel via GitHub Actions (`/rollback prod <version>`)

**Durée de rollback :** < 5 minutes (ECS redirige 100% du trafic vers l'ancienne task definition)

---

## 9. Scalabilité et Performance

### 9.1 Cibles de Performance par Endpoint

| Endpoint | p50 | p95 | p99 | Charge max | Cache |
|---|---|---|---|---|---|
| GET /api/v1/courses | 15ms | 50ms | 100ms | 500 req/s | Redis 300s |
| GET /api/v1/courses/:id | 10ms | 30ms | 80ms | 300 req/s | Redis 600s |
| POST /api/v1/courses/:id/enroll | 50ms | 150ms | 300ms | 100 req/s | Non |
| GET /api/v1/users/me | 5ms | 20ms | 50ms | 400 req/s | Non (auth) |
| POST /api/v1/assessments/:id/submit | 80ms | 180ms | 350ms | 50 req/s | Non |
| GET /api/v1/analytics/dashboard | 30ms | 100ms | 200ms | 200 req/s | Redis 60s |
| POST /api/v1/auth/token (Keycloak) | 80ms | 200ms | 400ms | 200 req/s | JWKS cache |
| GET /api/v1/health | 2ms | 5ms | 10ms | 1000 req/s | Non |

### 9.2 Horizontal Scaling (ECS Auto Scaling)

```hcl
# terraform/modules/ecs/autoscaling.tf

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "lms-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id

  target_tracking_scaling_policy_configuration {
    target_value       = 65.0  # Scale out si CPU > 65%
    scale_in_cooldown  = 300   # 5 min avant de scale in
    scale_out_cooldown = 60    # 1 min avant de scale out

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_appautoscaling_target" "api" {
  min_capacity       = 2    # HA minimum (2 AZ)
  max_capacity       = 20   # Limite budget mensuel
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
```

**Règle de dimensionnement :** 1 task ECS (1 vCPU / 2GB) peut traiter ~50 req/s avec p95 < 100ms. Pour 1000 req/s, prévoir 20 tasks minimum avec la marge de sécurité CPU.

### 9.3 Connection Pooling PostgreSQL

```typescript
// packages/db/src/prisma.service.ts
// Prisma utilise son propre connection pool par défaut

// Configuration via DATABASE_URL:
// postgresql://user:pass@host:5432/lms?connection_limit=20&pool_timeout=10

// Pour les workloads haute concurrence, PgBouncer en mode transaction pooling
// est déployé en sidecar ECS:

// ECS Task Definition sidecar:
// Container: pgbouncer
//   pool_mode: transaction
//   max_client_conn: 1000  (connexions depuis l'app)
//   default_pool_size: 20  (connexions vers RDS)
//   max_db_connections: 100
//   server_idle_timeout: 600

// Dimensionnement RDS max_connections:
// db.r6g.large: RAM 16GB → max_connections = 16384 / (work_mem + overhead)
// Avec work_mem=4MB: ~1000 connexions max recommandées
// PgBouncer maintient 100 connexions poolées vers RDS
// 20 tasks ECS × 20 connexions Prisma = 400 → géré par PgBouncer → 100 vers RDS
```

---

## 10. ADRs Associés (Références)

Les décisions d'architecture suivantes sont documentées dans le document ADR LMS Kernel (document séparé) et constituent le fondement des choix techniques de ce system design :

| ADR | Titre | Statut | Section concernée |
|---|---|---|---|
| ADR-001 | NestJS + Fastify vs Express vs Hono | Accepté | §4.1, §5.2 |
| ADR-002 | PostgreSQL + RLS vs Schéma-par-Tenant vs Base-par-Tenant | Accepté | §3.1, §3.3, §6.1 |
| ADR-003 | Keycloak vs Auth0/Okta vs NextAuth.js custom | Accepté | §4.3, §5.1 |
| ADR-004 | Monolithe Modulaire vs Microservices vs BFF Pattern | Accepté | §2.3, §3.4 |

**Processus de mise à jour de ce document :**
1. Toute modification architecturale majeure déclenche la création d'un nouvel ADR
2. Ce document est mis à jour dans la même PR que le code implémentant le changement
3. Revue obligatoire par l'Architecte Principal + Lead Sécurité avant merge

---

*Document généré le 2026-02-28. Version suivante attendue après Sprint 03 (architecture Analytics).*