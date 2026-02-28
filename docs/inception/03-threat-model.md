# Modèle de Menaces — LMS Kernel
> Version 1.0 | Date: 2026-02-28 | Auteur: Isabelle Chen, Lead Sécurité CISSP
> Révisé par: Thomas Martin (Architecte), Alexandra Dupont (CTO)
> Méthodologie: STRIDE + DREAD
> Référentiel: OWASP Threat Modeling, NIST SP 800-30 Rev 1, CWE/MITRE ATT&CK

---

## 1. Portée et Assets à Protéger

### 1.1 Périmètre

Le modèle de menaces couvre l'ensemble de la plateforme LMS Kernel dans son déploiement de production sur AWS ca-central-1 (région Canada — Centre). Il inclut les composants applicatifs, l'infrastructure cloud, les intégrations tierces et les flux de données entre tenants.

**Hors périmètre :** Les postes clients des utilisateurs finaux, les réseaux internes des institutions clientes, les systèmes RH ou SIS (Student Information System) des tenants qui ne s'interfacent pas directement avec l'API LMS Kernel.

### 1.2 Assets Classifiés

| ID | Asset | Classification | Valeur Métier | Propriétaire |
|----|-------|---------------|---------------|--------------|
| A-01 | PII Learners (nom, email, progression, évaluations, certificats) | CONFIDENTIEL | Critique | Tenant / DPO |
| A-02 | PII Instructeurs (nom, email, contenus créés) | CONFIDENTIEL | Élevée | Tenant / DPO |
| A-03 | Données de facturation tenant | CONFIDENTIEL | Critique | Diofevre / Finance |
| A-04 | Tokens JWT (access + refresh) | CONFIDENTIEL | Critique | Auth Service |
| A-05 | Clés privées RSA Keycloak (RS256) | SECRET | Critique | Ops / Keycloak |
| A-06 | Audit logs (chaîne SHA-256 immuable) | CONFIDENTIEL | Élevée | Compliance |
| A-07 | Secrets applicatifs (AWS SM + Bitwarden SM) | SECRET | Critique | Ops / SecEng |
| A-08 | Schéma de base de données PostgreSQL | INTERNE | Élevée | Architecture |
| A-09 | Configuration tenant (subdomain, paramètres SAML) | CONFIDENTIEL | Élevée | Tenant Admin |
| A-10 | Code source LMS Kernel (github.com/Diofevre/lms-kernel) | INTERNE | Critique | Engineering |
| A-11 | Clés de chiffrement AES-256 (PII at rest) | SECRET | Critique | Ops / KMS |
| A-12 | Cache Redis (sessions, données temporaires) | CONFIDENTIEL | Moyenne | Ops |

### 1.3 Acteurs (Threat Actors)

| Acteur | Motivation | Capacité | Probabilité |
|--------|-----------|---------|------------|
| Étudiant malveillant (Learner interne) | Modification de notes, accès aux évaluations d'autrui | Faible à Moyenne | Élevée |
| Instructeur ou Admin tenant compromis | Exfiltration de données, sabotage | Moyenne | Moyenne |
| Concurrent ou acteur externe | Espionnage industriel, disruption SaaS | Élevée | Faible |
| Cybercriminel opportuniste | Ransomware, revente de PII | Élevée | Moyenne |
| Insider malveillant (employé Diofevre) | Accès non autorisé aux données multi-tenant | Très Élevée | Faible |
| Nation-state / APT | Exfiltration massive, persistance longue durée | Très Élevée | Très Faible |
| Bot / scanner automatisé | Credential stuffing, scraping | Faible | Très Élevée |

---

## 2. Diagramme de Flux de Données (DFD)

### 2.1 Zones de Confiance

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  ZONE 0 — INTERNET (Non fiable)                                                 ║
║                                                                                  ║
║   [Navigateur Learner]   [Navigateur Instructeur]   [API Client Institution]    ║
║         │                        │                           │                   ║
║         └────────────────────────┴───────────────────────────┘                  ║
║                                  │ HTTPS/TLS 1.3                                ║
╚══════════════════════════════════╪═════════════════════════════════════════════╝
                                   │
╔══════════════════════════════════╪═════════════════════════════════════════════╗
║  ZONE 1 — DMZ / EDGE                                                            ║
║                                  ↓                                              ║
║   ┌──────────────────────────────────────────────────────────┐                  ║
║   │  AWS CloudFront (CDN) + WAF (OWASP Managed Rules)        │                  ║
║   │  → TLS termination, DDoS protection, Geo-blocking        │                  ║
║   └──────────────────────────────┬───────────────────────────┘                  ║
║                                  │ HTTPS interne                                ║
║   ┌──────────────────────────────┴───────────────────────────┐                  ║
║   │  AWS ALB (Application Load Balancer)                     │                  ║
║   │  → Subdomain routing : {tenant}.lms-kernel.ca            │                  ║
║   └──────────────────────────────┬───────────────────────────┘                  ║
╚══════════════════════════════════╪═════════════════════════════════════════════╝
                                   │
╔══════════════════════════════════╪═════════════════════════════════════════════╗
║  ZONE 2 — APP (VPC Privé — ca-central-1)                                        ║
║                                  ↓                                              ║
║   ┌──────────────────────────────────────────────────────────┐                  ║
║   │  NestJS / Fastify API (ECS Fargate)                      │                  ║
║   │  Pipeline: TenantMiddleware → ThrottlerGuard →           │                  ║
║   │            AuthGuard → AuditInterceptor →                │                  ║
║   │            Controller → HttpExceptionFilter              │                  ║
║   └───┬─────────────────┬────────────────┬───────────────────┘                  ║
║       │ OIDC/JWKS       │ TCP 6379        │ TCP 5432                            ║
║       ↓                 ↓                 ↓                                      ║
║   ┌────────────┐  ┌───────────┐  ┌──────────────────────────┐                  ║
║   │  Keycloak  │  │  Redis 7  │  │  PostgreSQL 16 (RDS)     │                  ║
║   │  24 (ECS)  │  │  (ElastiC)│  │  Multi-tenant + RLS      │                  ║
║   └────────────┘  └───────────┘  └──────────────────────────┘                  ║
║                                                                                  ║
║   ┌──────────────────────────────────────────────────────────┐                  ║
║   │  AWS Secrets Manager (secrets applicatifs)               │                  ║
║   │  AWS KMS (clés AES-256)                                  │                  ║
║   │  AWS S3 (contenus pédagogiques — chiffrés SSE-KMS)      │                  ║
║   └──────────────────────────────────────────────────────────┘                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

### 2.2 Flux de Données Détaillés

| ID Flux | Source | Destination | Protocole | Données | Zone Traversée |
|---------|--------|-------------|-----------|---------|----------------|
| F-01 | Navigateur | CloudFront/WAF | HTTPS TLS 1.3 | Requêtes HTTP, credentials OIDC | 0 → 1 |
| F-02 | CloudFront | ALB | HTTPS TLS 1.3 | Requêtes routées par subdomain | 1 → 2 |
| F-03 | ALB | NestJS API | HTTP (interne VPC) | Requêtes avec headers X-Tenant-ID | 1 → 2 |
| F-04 | NestJS API | Keycloak | HTTPS (JWKS endpoint) | Validation JWT, refresh token | 2 → 2 |
| F-05 | Navigateur | Keycloak | HTTPS TLS 1.3 | Flux OIDC authorization_code | 0 → 2 |
| F-06 | NestJS API | PostgreSQL | TCP chiffré (SSL) | Requêtes SQL avec RLS SET app.tenant_id | 2 → 2 |
| F-07 | NestJS API | Redis | TCP chiffré (TLS) | Cache sessions, rate limiting counters | 2 → 2 |
| F-08 | NestJS API | AWS SM | HTTPS (SDK) | Lecture secrets au démarrage | 2 → 2 |
| F-09 | NestJS API | S3 | HTTPS (VPC Endpoint) | Upload/download contenus pédagogiques | 2 → 2 |
| F-10 | AuditInterceptor | PostgreSQL (audit_logs) | TCP SSL | Écriture logs avec hash SHA-256 | 2 → 2 |
| F-11 | CI/CD (GitHub Actions) | AWS (ECS/ECR) | HTTPS (OIDC role) | Déploiement images Docker signées | Externe → 2 |

---

## 3. Analyse STRIDE par Composant

### Légende DREAD

| Critère | Description | Score 1–3 |
|---------|-------------|-----------|
| **D**amage | Impact si exploité | 1=Faible, 2=Moyen, 3=Critique |
| **R**eproducibility | Facilité à reproduire | 1=Difficile, 3=Trivial |
| **E**xploitability | Effort technique requis | 1=Expert requis, 3=Aucune compétence |
| **A**ffected Users | Nombre d'utilisateurs impactés | 1=Isolé, 3=Tous tenants |
| **D**iscoverability | Facilité à découvrir la vulnérabilité | 1=Caché, 3=Documenté publiquement |

**Score DREAD = (D + R + E + A + D) / 5 × 10 → converti en CVSS approximatif**

---

### 3.1 Authentification Keycloak / JWT

#### TH-01 — JWT Token Theft via XSS ou Interception Réseau
- **Catégorie STRIDE :** Spoofing + Information Disclosure
- **Description :** Un attaquant exfiltre un access token JWT valide (via XSS sur le frontend, réseau non chiffré ou log applicatif) et l'utilise pour se faire passer pour la victime pendant jusqu'à 15 minutes (durée d'expiration). Le refresh token (7 jours) constitue une menace prolongée si compromis.
- **Flux concerné :** F-01, F-05
- **DREAD :** D=3, R=2, E=2, A=2, D=2 → Score=**8.0**
- **CVSS 3.1 approximatif :** 8.1 (AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N)
- **Contrôle actuel :** TLS 1.3 obligatoire (F-01), expiration 15min access token
- **Lacune :** Pas de binding du token à l'empreinte client (IP, User-Agent), pas de token rotation détectée côté API

#### TH-02 — JWT Replay Attack après Déconnexion
- **Catégorie STRIDE :** Spoofing + Elevation of Privilege
- **Description :** Après une déconnexion (logout) côté client, le JWT access token reste techniquement valide jusqu'à son expiration (15min). Un attaquant ayant intercepté le token peut continuer à l'utiliser. Le refresh token Keycloak peut ne pas être révoqué si la session Keycloak n'est pas explicitement terminée.
- **Flux concerné :** F-04
- **DREAD :** D=2, R=3, E=2, A=1, D=3 → Score=**7.0**
- **CVSS approximatif :** 6.5 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N)
- **Contrôle actuel :** Expiration 15min minimise la fenêtre
- **Lacune :** Absence de liste de révocation (token blocklist) dans Redis ; le logout ne force pas la révocation côté Keycloak via l'endpoint `/logout`

#### TH-03 — Compromission des Clés Privées RSA Keycloak
- **Catégorie STRIDE :** Spoofing + Tampering
- **Description :** Si la clé privée RS256 de Keycloak est compromise (fuite via log, dump mémoire, accès non autorisé au volume Keycloak), l'attaquant peut forger des JWT valides pour n'importe quel utilisateur de n'importe quel tenant, avec n'importe quel rôle.
- **Flux concerné :** F-04, A-05
- **DREAD :** D=3, R=1, E=1, A=3, D=1 → Score=**6.0** (impact catastrophique mais faible probabilité)
- **CVSS approximatif :** 9.1 (AV:N/AC:L/PR:H/UI:N/S:C/C:H/I:H/A:H) — si réalisé
- **Contrôle actuel :** Keycloak déployé dans VPC privé, pas d'accès direct depuis Internet
- **Lacune :** Rotation périodique des clés Keycloak non documentée ; pas d'alerting sur les accès aux volumes persistants Keycloak

#### TH-04 — Brute Force / Credential Stuffing sur Keycloak
- **Catégorie STRIDE :** Spoofing
- **Description :** Attaque automatisée tentant des combinaisons login/mot de passe sur le endpoint Keycloak `/realms/{tenant}/protocol/openid-connect/token`. Les tenants avec des politiques de mot de passe faibles ou des listes de credentials compromis sont vulnérables.
- **Flux concerné :** F-05
- **DREAD :** D=2, R=3, E=3, A=2, D=3 → Score=**7.8**
- **CVSS approximatif :** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)
- **Contrôle actuel :** ThrottlerGuard protège l'API NestJS (10/s, 200/min, 1000/h) ; Keycloak expose ses propres endpoints
- **Lacune :** Le ThrottlerGuard NestJS ne protège PAS les endpoints Keycloak directs ; brute force possible en contournant l'API NestJS ; pas de CAPTCHA configuré sur Keycloak

---

### 3.2 API NestJS (Routes Protégées)

#### TH-05 — Mass Assignment via DTOs (Injection de Champs Non Autorisés)
- **Catégorie STRIDE :** Tampering + Elevation of Privilege
- **Description :** Malgré le strip des champs inconnus par class-validator, un attaquant peut tenter d'injecter des champs valides mais non attendus dans le DTO (ex: `role: "TENANT_ADMIN"`, `tenantId: "autre-tenant"`, `isVerified: true`) si la whitelist des propriétés n'est pas strictement appliquée via `@IsNotEmpty` + `@Exclude` au niveau Prisma.
- **Flux concerné :** F-03 → Controller
- **DREAD :** D=3, R=2, E=2, A=2, D=2 → Score=**7.4**
- **CVSS approximatif :** 8.1 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N)
- **Contrôle actuel :** `class-validator` avec `whitelist: true, forbidNonWhitelisted: true` (à vérifier dans le pipe global)
- **Lacune :** Si le `ValidationPipe` global n'est pas configuré avec `whitelist: true` ET `forbidNonWhitelisted: true`, les champs supplémentaires sont silencieusement ignorés mais peuvent traverser vers Prisma si le spread operator `...dto` est utilisé directement

#### TH-06 — IDOR (Insecure Direct Object Reference) sur Ressources Tenant
- **Catégorie STRIDE :** Information Disclosure + Elevation of Privilege
- **Description :** Un Learner du tenant A tente d'accéder à `/api/courses/550e8400-e29b-41d4-a716-446655440000` (UUID appartenant au tenant B) en manipulant l'identifiant dans l'URL. Si les guards ne vérifient que l'authentification et le rôle, mais pas l'appartenance de la ressource au tenant courant, la fuite est possible.
- **Flux concerné :** F-03, F-06
- **DREAD :** D=3, R=3, E=3, A=2, D=3 → Score=**9.6** ← **CRITIQUE**
- **CVSS approximatif :** 8.8 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N)
- **Contrôle actuel :** RLS PostgreSQL (SET app.tenant_id) comme première ligne de défense
- **Lacune :** RLS est efficace uniquement si SET app.tenant_id est systématiquement positionné AVANT chaque requête ; un oubli dans une transaction Prisma complexe (raw query) annule la protection ; pas de vérification applicative explicite de l'appartenance tenant dans chaque service

#### TH-07 — Injection SQL via Prisma Raw Queries
- **Catégorie STRIDE :** Tampering + Information Disclosure
- **Description :** Si des raw queries Prisma (`$queryRaw`, `$executeRaw`) sont utilisées avec interpolation de variables non sécurisée (ex: `prisma.$queryRaw\`SELECT * FROM courses WHERE title = '${userInput}'\``), une injection SQL est possible, contournant à la fois l'ORM et le RLS.
- **Flux concerné :** F-06
- **DREAD :** D=3, R=2, E=2, A=3, D=2 → Score=**8.0**
- **CVSS approximatif :** 9.8 si exploité sans authentification, 8.8 avec authentification
- **Contrôle actuel :** Prisma ORM comme couche principale (paramétrisé par défaut), SonarCloud SAST
- **Lacune :** Les raw queries ne sont pas inventoriées ; absence de règle SAST spécifique interdisant l'interpolation dans `$queryRaw`

#### TH-08 — Déni de Service Applicatif (Rate Limit Bypass)
- **Catégorie STRIDE :** Denial of Service
- **Description :** Le ThrottlerGuard s'appuie sur l'IP source ou un identifiant de session. Un attaquant peut contourner les limites en distribuant les requêtes via un botnet, en changeant d'IP (proxies), ou en exploitant des endpoints non protégés par le guard (ex: health check, endpoints Keycloak directs).
- **Flux concerné :** F-01, F-03
- **DREAD :** D=2, R=2, E=2, A=3, D=2 → Score=**6.6**
- **CVSS approximatif :** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **Contrôle actuel :** ThrottlerGuard (10/s, 200/min, 1000/h) + CloudFront WAF
- **Lacune :** Pas de rate limiting par tenant (un tenant peut saturer les ressources partagées au détriment des autres) ; Redis utilisé pour les compteurs : si Redis tombe, le fallback est-il permissif ou bloquant ?

---

### 3.3 Middleware Tenant (Subdomain Extraction)

#### TH-09 — Tenant Impersonation via Subdomain Spoofing
- **Catégorie STRIDE :** Spoofing + Elevation of Privilege
- **Description :** Le TenantMiddleware extrait l'identifiant tenant depuis le subdomain (`universite-laval.lms-kernel.ca`). Si l'extraction repose uniquement sur le header `Host` sans validation croisée avec un registre de tenants validés, un attaquant peut forger le header `Host` (via proxy ou requête directe à l'ALB) pour usurper l'identité d'un autre tenant.
- **Flux concerné :** F-02, F-03
- **DREAD :** D=3, R=2, E=2, A=3, D=2 → Score=**8.0** ← **CRITIQUE**
- **CVSS approximatif :** 9.1 (AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N)
- **Contrôle actuel :** ALB routing par subdomain (SNI)
- **Lacune :** Si l'ALB accepte des requêtes avec un header Host arbitraire, le TenantMiddleware doit impérativement valider le slug extrait contre la base de données (`tenant_slug IN (SELECT slug FROM tenants WHERE active = true)`) ; un accès direct à l'ALB (IP) bypassant CloudFront doit être bloqué par Security Group

#### TH-10 — Cross-Tenant Data Leakage via RLS Bypass
- **Catégorie STRIDE :** Information Disclosure
- **Description :** La Row Level Security PostgreSQL dépend du paramètre de session `app.tenant_id`. Dans un contexte de connection pooling (PgBouncer ou pool Prisma), si une connexion est réutilisée sans réinitialisation du paramètre de session entre deux requêtes de tenants différents, les données d'un tenant deviennent accessibles à l'autre.
- **Flux concerné :** F-06, A-01, A-02
- **DREAD :** D=3, R=2, E=1, A=3, D=1 → Score=**7.0** ← **CRITIQUE** (impact sur compliance Loi 25)
- **CVSS approximatif :** 9.1 (AV:N/AC:H/PR:L/UI:N/S:C/C:H/I:N/A:N)
- **Contrôle actuel :** RLS PostgreSQL activée, SET app.tenant_id dans chaque transaction
- **Lacune :** En mode `session pooling` (PgBouncer), le `SET` sans `LOCAL` persiste à la connexion ; il faut utiliser `SET LOCAL app.tenant_id` dans une transaction BEGIN/COMMIT, ou utiliser le mode `transaction pooling` ; tests d'intégration cross-tenant manquants

#### TH-11 — Cache Poisoning Redis (Cross-Tenant via Cache Key Collision)
- **Catégorie STRIDE :** Tampering + Information Disclosure
- **Description :** Si les clés de cache Redis ne sont pas préfixées par le tenant_id (ex: `course:123` au lieu de `tenant:laval:course:123`), un learner du tenant A peut potentiellement lire ou polluer le cache d'un même objet appartenant au tenant B si les IDs se chevauchent (probabilité faible avec UUID v4 mais non nulle).
- **Flux concerné :** F-07
- **DREAD :** D=2, R=1, E=1, A=2, D=2 → Score=**5.2**
- **CVSS approximatif :** 6.5
- **Contrôle actuel :** UUID v4 pour les IDs (collision quasi-impossible)
- **Lacune :** Convention de nommage des clés Redis non documentée ni enforced ; pas de tests de non-régression sur l'isolation des clés

---

### 3.4 Base de Données PostgreSQL + RLS

#### TH-12 — Privilege Escalation via SUPER_ADMIN Role Abuse
- **Catégorie STRIDE :** Elevation of Privilege
- **Description :** Le rôle SUPER_ADMIN contourne naturellement le RLS tenant (il voit toutes les données). Si un compte SUPER_ADMIN est compromis (credential stuffing, insider, session hijacking), l'attaquant a un accès illimité à toutes les données de tous les tenants.
- **Flux concerné :** F-03, F-06
- **DREAD :** D=3, R=1, E=1, A=3, D=1 → Score=**6.0** (faible probabilité, impact maximal)
- **CVSS approximatif :** 9.8 si exploité
- **Contrôle actuel :** Rôle SUPER_ADMIN géré par Keycloak, authentification forte supposée
- **Lacune :** MFA non mentionné comme obligatoire pour SUPER_ADMIN ; pas de politique de session séparée (durée réduite) pour les comptes à privilèges élevés ; absence de Just-In-Time access pour les opérations SUPER_ADMIN

#### TH-13 — Audit Log Tampering
- **Catégorie STRIDE :** Tampering + Repudiation
- **Description :** La chaîne SHA-256 des audit logs garantit l'intégrité en séquence, mais si un attaquant ayant accès à la base (ex: SUPER_ADMIN compromis, connexion directe RDS) peut supprimer ou modifier les dernières entrées ET recalculer la chaîne depuis l'entrée modifiée, la preuve d'intégrité est compromise.
- **Flux concerné :** F-10, A-06
- **DREAD :** D=3, R=1, E=1, A=2, D=2 → Score=**5.8**
- **CVSS approximatif :** 7.7
- **Contrôle actuel :** Hash chain SHA-256 (@lms/audit), table audit_logs immuable (permissions applicatives)
- **Lacune :** Si l'utilisateur PostgreSQL applicatif a les permissions DELETE/UPDATE sur `audit_logs`, la protection est contournable via SQL direct ; la racine de la chaîne (hash initial) doit être stockée hors-base (ex: AWS CloudWatch Logs Insights, S3 immuable avec Object Lock)

#### TH-14 — SQL Injection via Prisma `$queryRaw` (duplication partielle TH-07)
- **Catégorie STRIDE :** Tampering
- **Description :** Spécifique aux requêtes de reporting/analytics qui nécessitent souvent des requêtes dynamiques. Les filtres de date, de tri ou de recherche full-text passés en paramètre URL et injectés dans des raw queries sont particulièrement exposés.
- **Flux concerné :** F-06
- **DREAD :** D=3, R=2, E=2, A=2, D=2 → Score=**7.4**
- **Contrôle actuel :** SonarCloud SAST (nightly), OWASP ZAP DAST
- **Lacune :** DAST ne teste pas tous les paramètres de filtre ; inventaire des raw queries requis

---

### 3.5 Infrastructure AWS

#### TH-15 — Compromission des Credentials AWS (OIDC CI/CD)
- **Catégorie STRIDE :** Spoofing + Elevation of Privilege
- **Description :** Le pipeline CI/CD utilise des rôles OIDC AWS pour déployer. Si le GitHub repository est compromis (branch protection bypassée, action malveillante dans une dépendance tierce), un attaquant peut déclencher un déploiement d'une image Docker corrompue contenant un backdoor ou des credentials exfiltrés.
- **Flux concerné :** F-11
- **DREAD :** D=3, R=1, E=2, A=3, D=2 → Score=**7.0**
- **CVSS approximatif :** 9.0 si exploité
- **Contrôle actuel :** Gitleaks (secrets detection), GPG signatures sur commits, Snyk (dépendances)
- **Lacune :** Absence de signature des images Docker (Docker Content Trust / Cosign Sigstore) ; les actions GitHub tierces ne sont pas épinglées par SHA256 digest dans les workflows

#### TH-16 — S3 Bucket Misconfiguration (Contenus Pédagogiques)
- **Catégorie STRIDE :** Information Disclosure
- **Description :** Une mauvaise configuration du bucket S3 (ACL public, policy trop permissive, Block Public Access désactivé) exposerait les contenus pédagogiques (vidéos, PDFs, évaluations) à tous les tenants ou à Internet.
- **Flux concerné :** F-09
- **DREAD :** D=2, R=2, E=2, A=2, D=2 → Score=**6.0**
- **CVSS approximatif :** 7.5
- **Contrôle actuel :** VPC Endpoint S3 (accès depuis VPC uniquement mentionné en architecture)
- **Lacune :** Pas de mention de S3 Block Public Access enforced au niveau compte AWS ; pas d'audit AWS Config Rules pour les buckets S3

#### TH-17 — Fuite de Secrets via Logs CloudWatch
- **Catégorie STRIDE :** Information Disclosure
- **Description :** Des secrets (tokens JWT, clés API, mots de passe) peuvent être accidentellement loggés dans les logs applicatifs NestJS envoyés à CloudWatch Logs si les objets de requête sont sérialisés en entier dans les logs d'erreur ou de debug.
- **Flux concerné :** F-03, A-07
- **DREAD :** D=3, R=2, E=2, A=2, D=2 → Score=**7.4**
- **CVSS approximatif :** 6.8
- **Contrôle actuel :** Gitleaks détecte les secrets dans le code source ; AWS SM pour les secrets
- **Lacune :** Pas de scrubbing des logs applicatifs (masquage des headers Authorization, des tokens, des données PII) ; pas de politique de rétention CloudWatch Logs définie

---

## 4. Risques Prioritaires (Top 10 CVSS)

| Rang | ID | Menace | Score CVSS | Catégorie STRIDE | Statut |
|------|----|--------|-----------|-----------------|--------|
| 1 | TH-06 | IDOR Cross-Tenant sur ressources | 9.6 | Information Disclosure + EoP | A remédier — Critique |
| 2 | TH-09 | Tenant Impersonation via Subdomain Spoofing | 9.1 | Spoofing + EoP | A remédier — Critique |
| 3 | TH-10 | Cross-Tenant Data Leakage via RLS Bypass | 9.1 | Information Disclosure | A remédier — Critique |
| 4 | TH-03 | Compromission Clés RSA Keycloak | 9.1* | Spoofing + Tampering | Risque résiduel — Faible probabilité |
| 5 | TH-15 | Compromission CI/CD OIDC AWS | 9.0* | Spoofing + EoP | A remédier — Élevé |
| 6 | TH-07 | Injection SQL Raw Queries Prisma | 8.8 | Tampering + Disclosure | A remédier — Élevé |
| 7 | TH-05 | Mass Assignment DTOs NestJS | 8.1 | Tampering + EoP | A vérifier — Moyen |
| 8 | TH-01 | JWT Token Theft / Replay | 8.1 | Spoofing + Disclosure | Partiellement mitigé |
| 9 | TH-04 | Brute Force Keycloak | 7.5 | Spoofing | A remédier — Moyen |
| 10 | TH-08 | Rate Limit Bypass / DoS | 7.5 | DoS | A améliorer |

*CVSS si la menace est réalisée ; probabilité actuelle estimée faible

---

## 5. Contrôles Implémentés / À Implémenter / Non Implémentés

### 5.1 Contrôles Implémentés (Validés)

| ID | Contrôle | Composant | Efficacité estimée |
|----|----------|-----------|-------------------|
| C-01 | TLS 1.3 obligatoire | CloudFront, ALB, API, DB | Élevée |
| C-02 | JWT RS256 avec expiration 15min (access) / 7j (refresh) | Keycloak 24 | Élevée |
| C-03 | JWKS endpoint validation (bibliothèque `jose`) | NestJS AuthGuard | Élevée |
| C-04 | Row Level Security PostgreSQL (SET app.tenant_id) | PostgreSQL 16 | Moyenne (voir lacunes) |
| C-05 | ThrottlerGuard (10/s, 200/min, 1000/h) | NestJS | Moyenne |
| C-06 | class-validator + DTOs (strips unknown fields) | NestJS | Élevée si configuré strictement |
| C-07 | Audit log SHA-256 hash chain | @lms/audit | Moyenne (voir lacunes) |
| C-08 | AWS Secrets Manager (prod) | Infrastructure | Élevée |
| C-09 | Chiffrement AES-256 PII at rest | PostgreSQL / KMS | Élevée |
| C-10 | Gitleaks (secrets detection CI) | CI/CD Stage 0 | Moyenne |
| C-11 | GPG signatures sur commits | CI/CD Stage 0 | Élevée |
| C-12 | Snyk (dépendances) | CI/CD Stage 1 | Élevée |
| C-13 | SonarCloud SAST | CI/CD Stage 3 | Moyenne |
| C-14 | OWASP ZAP DAST (nightly) | CI/CD Stage 3 | Moyenne |
| C-15 | Pipeline de sécurité : TenantMiddleware → AuthGuard → AuditInterceptor | NestJS | Élevée |
| C-16 | RBAC 5 rôles (SUPER_ADMIN, TENANT_ADMIN, INSTRUCTOR, AUDITOR, LEARNER) | Keycloak + NestJS | Élevée |

### 5.2 Contrôles À Implémenter (Priorité Haute)

| ID | Contrôle Recommandé | Menaces Mitigées | Effort | Délai |
|----|--------------------|--------------------|--------|-------|
| C-17 | Token blocklist Redis (révocation JWT post-logout) | TH-01, TH-02 | Moyen | 30 jours |
| C-18 | Validation du slug tenant contre DB dans TenantMiddleware | TH-09 | Faible | 14 jours |
| C-19 | SET LOCAL app.tenant_id dans transaction BEGIN/COMMIT (RLS) | TH-10 | Moyen | 21 jours |
| C-20 | MFA obligatoire pour SUPER_ADMIN et TENANT_ADMIN | TH-12, TH-03 | Moyen | 30 jours |
| C-21 | Inventaire et audit des raw queries Prisma ($queryRaw) | TH-07, TH-14 | Faible | 14 jours |
| C-22 | Rate limiting par tenant (isolation de la consommation) | TH-08 | Moyen | 45 jours |
| C-23 | Signature images Docker (Cosign/Sigstore) | TH-15 | Moyen | 45 jours |
| C-24 | Épinglage des GitHub Actions par SHA256 | TH-15 | Faible | 14 jours |
| C-25 | Log scrubbing (masquage Authorization, PII dans logs) | TH-17 | Moyen | 30 jours |
| C-26 | Tests d'intégration cross-tenant (vérification isolation RLS) | TH-10, TH-06 | Élevé | 60 jours |
| C-27 | Vérification applicative appartenance tenant dans chaque service | TH-06 | Élevé | 45 jours |
| C-28 | AWS Config Rules pour S3 (Block Public Access, chiffrement) | TH-16 | Faible | 14 jours |
| C-29 | Security Group ALB restreignant accès direct (CloudFront uniquement) | TH-09 | Faible | 7 jours |

### 5.3 Contrôles Non Implémentés (Risque Accepté ou Hors Portée)

| ID | Contrôle | Justification de Non-Implémentation | Risque Résiduel |
|----|----------|-------------------------------------|----------------|
| C-30 | HSM (Hardware Security Module) pour clés Keycloak | Coût élevé pour phase actuelle ; AWS KMS comme alternative | Faible (KMS + VPC) |
| C-31 | UEBA (User and Entity Behavior Analytics) | Hors portée budget Phase 1 | Moyen |
| C-32 | WAF custom rules (au-delà OWASP Managed) | Prévu Phase 2 | Moyen (CloudFront WAF actif) |
| C-33 | Honeypot / Canary tokens | Non prioritaire Phase 1 | Faible |

---

## 6. Checklist OWASP Top 10 2021

| # | Catégorie OWASP | Statut LMS Kernel | Contrôles / Lacunes |
|---|----------------|------------------|---------------------|
| A01 | Broken Access Control | **Partiellement mitigé** | RLS implémenté (lacune connection pooling) ; IDOR non systématiquement vérifié côté applicatif ; TH-06, TH-09 |
| A02 | Cryptographic Failures | **Mitigé** | TLS 1.3, AES-256 at rest, RS256 JWT, KMS ; rotation des clés à documenter |
| A03 | Injection | **Partiellement mitigé** | ORM Prisma (paramétrisé) ; raw queries à auditer ; SAST/DAST en place ; TH-07 |
| A04 | Insecure Design | **En cours** | Threat model (ce document) ; manque de tests de sécurité unitaires intégrés au dev |
| A05 | Security Misconfiguration | **Partiellement mitigé** | AWS Config non mentionné ; Security Groups à revoir ; Keycloak hardening à valider |
| A06 | Vulnerable Components | **Mitigé** | Snyk en CI, GPG signatures, mises à jour régulières supposées |
| A07 | Identification and Auth Failures | **Partiellement mitigé** | Keycloak OIDC solide ; MFA non obligatoire pour admins ; token blocklist absente ; TH-01, TH-02, TH-04 |
| A08 | Software and Data Integrity Failures | **Partiellement mitigé** | GPG signatures commits ; Snyk ; images Docker non signées ; TH-15 |
| A09 | Security Logging and Monitoring Failures | **Partiellement mitigé** | Audit log hash chain ; alerting sur anomalies non défini ; pas de SIEM intégré |
| A10 | Server-Side Request Forgery (SSRF) | **Non évalué** | Endpoints récupérant des URLs externes (contenus SCORM, webhooks tenant) à auditer |

---

## 7. Plan de Remédiation

### 7.1 Niveau Critique — Action Immédiate (0–14 jours)

| Action | Menace(s) | Responsable | Effort | Critère de Succès |
|--------|----------|-------------|--------|------------------|
| Ajouter Security Group ALB : autoriser uniquement les IPs CloudFront | TH-09 | DevOps (Marc Tremblay) | 2h | Test de connexion directe IP ALB bloqué |
| Valider slug tenant contre `tenants` DB dans TenantMiddleware | TH-09 | Backend Lead (Priya Nair) | 4h | Test avec Host: header forgé → 404 |
| Inventaire complet des `$queryRaw` Prisma + revue | TH-07, TH-14 | Équipe Backend | 1 jour | Document inventaire + 0 interpolation non sécurisée |
| Épingler toutes les GitHub Actions par SHA256 digest | TH-15 | DevOps (Marc Tremblay) | 4h | Tous workflows épinglés |
| AWS Config Rule : S3 Block Public Access + chiffrement | TH-16 | DevOps (Marc Tremblay) | 2h | Zéro bucket non conforme |

### 7.2 Niveau Élevé — Court Terme (15–30 jours)

| Action | Menace(s) | Responsable | Effort | Critère de Succès |
|--------|----------|-------------|--------|------------------|
| Implémenter SET LOCAL dans transactions RLS (vérification pooling) | TH-10 | DBA + Backend Lead | 3 jours | Tests intégration cross-tenant passent |
| Implémenter token blocklist Redis (révocation JWT) | TH-01, TH-02 | Backend Lead (Priya Nair) | 5 jours | Logout invalide immédiatement le token |
| Obliger MFA pour SUPER_ADMIN et TENANT_ADMIN dans Keycloak | TH-12, TH-04 | Ops / Keycloak Admin | 1 jour | MFA requis à l'authentification |
| Implémenter log scrubbing (masquage Authorization, PII) | TH-17 | Backend Lead | 3 jours | Scan CloudWatch Logs : 0 token JWT visible |
| Vérification explicite appartenance tenant dans les services (couche applicative) | TH-06 | Équipe Backend | 5 jours | Tests IDOR passent sur toutes les routes |

### 7.3 Niveau Moyen — Moyen Terme (31–60 jours)

| Action | Menace(s) | Responsable | Effort | Critère de Succès |
|--------|----------|-------------|--------|------------------|
| Rate limiting par tenant (isolation) | TH-08 | Backend Lead | 5 jours | Un tenant ne peut pas saturer les autres |
| Suite de tests d'intégration cross-tenant | TH-10, TH-06 | QA + Backend | 10 jours | Tests automatisés dans CI bloquant |
| Signature images Docker avec Cosign/Sigstore | TH-15 | DevOps (Marc Tremblay) | 3 jours | Déploiement refuse image non signée |
| Configurer CAPTCHA Keycloak (politique login) | TH-04 | Keycloak Admin | 1 jour | CAPTCHA après 5 échecs |
| Configurer rotation périodique clés RSA Keycloak (tous les 90 jours) | TH-03 | Ops | 2 jours | Procédure documentée + automatisée |
| Définir politique rétention CloudWatch Logs (30 jours applicatif, 12 mois audit) | TH-17 | DevOps | 1 jour | Rétention configurée via CloudFormation |
| Évaluer et configurer SSRF protection (validation URLs externes) | A10 OWASP | Backend Lead | 5 jours | Audit endpoints + allowlist URLs |

### 7.4 Niveau Faible — Long Terme (61–90 jours)

| Action | Menace(s) | Responsable | Effort | Critère de Succès |
|--------|----------|-------------|--------|------------------|
| Intégrer SIEM (AWS Security Hub + GuardDuty) | Monitoring général | DevOps / SecEng | 10 jours | Alertes configurées sur anomalies |
| Durcissement configuration Keycloak (revue complète) | TH-03, TH-04 | Ops + SecEng | 5 jours | Checklist CIS Keycloak complétée |
| WAF custom rules (SQL injection, LFI, SSRF) | Multiple | DevOps | 5 jours | Règles testées sans faux positifs |
| Politique Just-In-Time access SUPER_ADMIN | TH-12 | Ops + SecEng | 5 jours | Accès SUPER_ADMIN limité dans le temps |

---

## 8. Révision et Maintenance

### 8.1 Calendrier de Révision

| Révision | Fréquence | Déclencheur | Responsable |
|---------|-----------|-------------|-------------|
| Revue de sécurité sprint | Bi-hebdomadaire | Chaque sprint | Isabelle Chen (Lead Sec) |
| Mise à jour threat model | Trimestrielle | Nouvelle fonctionnalité majeure | Isabelle Chen + Thomas Martin |
| Pentest externe | Annuelle | Avant chaque release majeure | Prestataire externe mandaté |
| Revue conformité Loi 25 | Semestrielle | Changement réglementaire | DPO + Isabelle Chen |
| Audit OWASP ZAP complet | Mensuelle (nightly automatisé) | CI/CD Stage 3 | DevOps (Marc Tremblay) |

### 8.2 Conditions de Révision Urgente

Ce document doit être révisé immédiatement en cas de :
- Découverte d'une CVE critique (CVSS ≥ 9.0) dans la stack (Keycloak, NestJS, Prisma, PostgreSQL, Redis)
- Incident de sécurité confirmé (breach, fuite de données)
- Changement majeur d'architecture (nouveau service, nouvelle intégration)
- Changement réglementaire (Loi 25 amendement, nouvelle directive CAI)
- Résultat de pentest externe révélant une menace non modélisée

### 8.3 Approbations

| Rôle | Nom | Signature | Date |
|------|-----|-----------|------|
| Lead Sécurité CISSP (Auteur) | Isabelle Chen | *Isabelle Chen* | 2026-02-28 |
| Architecte Logiciel | Thomas Martin | *Thomas Martin* | 2026-02-28 |
| CTO | Alexandra Dupont | *Alexandra Dupont* | 2026-02-28 |
| DPO / Responsable Confidentialité | Sophie Larrivée | *Sophie Larrivée* | 2026-02-28 |

*Prochain révision planifiée : 2026-05-28 (Q2 2026)*