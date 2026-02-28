# Charte de Projet — LMS Kernel

> Statut : Approuvé | Version : 1.0 | Date : 2026-02-28 | Auteur : Alexandra Dupont, CTO

---

## 1. Résumé Exécutif

LMS Kernel est une plateforme de gestion de l'apprentissage (Learning Management System) multi-tenant de nouvelle génération, développée par Diofevre à destination des institutions éducatives et des entreprises de formation du Québec. La plateforme est commercialisée en mode SaaS (Software as a Service) avec un modèle d'abonnement par tenant.

Le projet vise à livrer une première version commercialisable (Go-live) au **1er juin 2026**, après six sprints de deux semaines couvrant la fondation technique, les modules métier, l'expérience utilisateur, les intégrations, la beta interne et la release candidate.

LMS Kernel se distingue par sa conformité native à la **Loi 25 du Québec** (protection des renseignements personnels), son architecture modulaire extensible via un système de plugins (KernelModule), et son isolation stricte des données par tenant via le Row Level Security de PostgreSQL. L'infrastructure est hébergée exclusivement dans la région AWS **ca-central-1** (Canada — Montréal) pour satisfaire aux exigences de résidence des données.

Le budget total estimé du projet de développement initial est de **498 000 CAD**, pour une équipe de six rôles techniques coordonnés par la CTO Alexandra Dupont et l'Architecte Thomas Martin.

---

## 2. Contexte et Problématique

### 2.1 Contexte

Le marché québécois de la formation en ligne connaît une croissance soutenue depuis 2020. Les universités, les collèges (réseau CÉGEP) et les entreprises de formation professionnelle cherchent des solutions LMS adaptées à leur réalité réglementaire et linguistique. Les plateformes dominantes (Canvas, Moodle, D2L Brightspace) sont des solutions américaines dont l'hébergement ne satisfait pas systématiquement aux obligations de la Loi 25 sur la protection des renseignements personnels dans le secteur privé (L.R.Q. c. P-39.1, amendée par la Loi 64 en 2021).

Diofevre identifie une fenêtre d'opportunité pour positionner LMS Kernel comme la référence SaaS LMS conforme, souveraine et extensible pour le marché québécois et canadien francophone.

### 2.2 Problème à résoudre

Les institutions éducatives québécoises font face à quatre problèmes structurels avec les LMS existants :

1. **Non-conformité réglementaire** : Les données des apprenants (mineurs inclus) transitent et sont stockées hors du Canada, en violation potentielle de la Loi 25 et des politiques institutionnelles.
2. **Rigidité architecturale** : Les LMS du marché sont des monolithes figés qui ne permettent pas l'extension modulaire sans modifier le core, rendant les déploiements personnalisés coûteux et fragiles.
3. **Expérience utilisateur déficiente** : L'accessibilité (WCAG) n'est que partiellement respectée, excluant une partie des apprenants en situation de handicap et exposant les institutions à des risques légaux.
4. **Gestion du consentement absente** : Aucune solution du marché ne propose un module de gestion du consentement intégré au niveau de la couche de données, tel que l'exige la Loi 25 depuis septembre 2023.

### 2.3 Opportunité

Le marché cible immédiat est estimé à environ **320 institutions** au Québec (18 universités, 48 collèges, 254 organismes de formation agréés), auxquelles s'ajoutent les grandes entreprises assujetties à la Loi 25 dotées de programmes de formation internes. En ciblant un prix SaaS moyen de 8 000 CAD/an par tenant pour les petites institutions et 35 000 CAD/an pour les universités, le potentiel de revenus récurrents annuels (ARR) à 36 mois dépasse **2,1 M CAD** avec une pénétration de 5 % du marché adressable.

LMS Kernel se positionne en **first mover** sur le segment « LMS souverain québécois conforme Loi 25 », ce qui constitue un avantage concurrentiel durable difficile à répliquer par des acteurs étrangers.

---

## 3. Objectifs et Périmètre

### 3.1 Objectifs SMART

| # | Objectif | Métrique | Cible | Délai | Responsable |
|---|----------|----------|-------|-------|-------------|
| O1 | Livrer la plateforme en production | Go-live effectif, aucun P0 ouvert | 100 % fonctionnalités core livrées | 2026-06-01 | Alexandra Dupont |
| O2 | Conformité Loi 25 certifiée | Rapport d'audit interne validé par Lead Sécurité | 0 non-conformité critique | 2026-05-26 | Isabelle Chen |
| O3 | Accessibilité WCAG 2.1 AA | Score axe-core dans pipeline CI | 0 violation critique, < 5 mineures | 2026-05-26 | Lead QA |
| O4 | Performance backend | p95 latence API REST | < 200 ms en charge nominale (100 req/s par tenant) | 2026-05-11 | Lead Backend |
| O5 | Couverture de tests | Ratio lignes couvertes (Jest + Supertest) | ≥ 80 % backend, ≥ 70 % frontend | 2026-04-26 | Lead QA |
| O6 | Onboarding premier client (beta) | Tenant actif avec utilisateurs réels | ≥ 1 institution pilote, ≥ 50 apprenants | 2026-05-11 | Alexandra Dupont |
| O7 | Disponibilité SLA | Uptime mesuré en production | ≥ 99,5 % sur la période post-Go-live | 2026-07-01 | Lead DevOps |
| O8 | Audit trail immuable | Validation hash chain SHA-256 sur 100 % des events | 0 rupture de chaîne détectée | 2026-05-26 | Isabelle Chen |

### 3.2 IN SCOPE — Modules inclus dans la version 1.0

- **Module Auth** : Intégration Keycloak 24 (OIDC/SAML), AuthGuard JWT JWKS, refresh token rotation, SSO inter-applications
- **Module Tenant** : Provisionnement automatique de tenant, subdomain routing, isolation RLS, configuration par tenant (branding, quotas, features flags)
- **Module Consent** : Gestion du consentement conforme Loi 25 (collecte, révocation, historique, export), base légale par traitement de données
- **Module Audit** : Audit trail immuable avec hash chain SHA-256 (package @lms/audit), rôle AUDITOR, exports PDF/CSV signés
- **Module User** : CRUD utilisateurs, gestion des rôles (SUPER_ADMIN, TENANT_ADMIN, INSTRUCTOR, AUDITOR, LEARNER), invitation par email, désactivation RGPD/Loi 25
- **Module Course** : Création de cours, sections, leçons (texte, vidéo, PDF, SCORM 1.2/2004), gestion des brouillons et de la publication
- **Module Enrollment** : Inscription apprenants, listes d'attente, prérequis, date de début/fin, certificats d'achèvement
- **Module Assessment** : Quiz (QCM, vrai/faux, réponse courte), devoirs à remettre, grille de correction, barème, notes finales
- **Module Notification** : Notifications in-app, email (AWS SES), webhooks tenant-configurables, templates multilingues (FR/EN)
- **Module Analytics** : Tableaux de bord TENANT_ADMIN et INSTRUCTOR, taux de complétion, temps passé, progression par cohorte, exports de données
- **Module Plugin (KernelModule)** : Système d'extension avec cycle de vie onInit/onReady/onDestroy, registre de plugins, isolation par tenant
- **Infrastructure** : Pipeline CI/CD GitHub Actions, déploiement AWS ECS Fargate (ca-central-1), RDS PostgreSQL 16, ElastiCache Redis 7, CDN CloudFront, WAF

### 3.3 OUT OF SCOPE — Version 1.0

- Recommandations IA/ML (prévu Phase 2, Q3 2026)
- Application mobile native iOS/Android (prévu Phase 2)
- Intégration d'outils de visioconférence natifs (Teams, Zoom) — les liens externes sont supportés, l'intégration API ne l'est pas
- Marketplace de plugins tiers publique
- Support multidevise et facturation multi-pays (hors Canada)
- Fonctionnalités de gamification avancées (badges, leaderboards)
- Éditeur de contenu SCORM interne (import SCORM supporté, authoring non)
- Module de e-commerce et vente de cours au détail (B2C)
- Support de langues autres que le français et l'anglais
- Intégration avec des SIRH tiers (SAP SuccessFactors, Workday) — prévu Phase 3

---

## 4. Parties Prenantes (RACI)

**Légende :** R = Responsable (exécute) | A = Approbateur (valide et signe) | C = Consulté (contribue) | I = Informé (reçoit l'information)

| Domaine / Livrable | Alexandra Dupont (CTO) | Thomas Martin (Architecte) | Lead Backend | Lead Frontend | Lead DevOps | Lead QA | Isabelle Chen (Sécu) |
|--------------------|------------------------|----------------------------|--------------|---------------|-------------|---------|----------------------|
| Charte de projet | A | C | I | I | I | I | C |
| Vision technique | A | R | C | C | C | C | C |
| Schéma Prisma (LMSK-9) | A | R | R | I | I | I | C |
| Migrations RLS (LMSK-10) | I | A | R | I | C | I | R |
| AuthGuard Keycloak (LMSK-11) | I | A | R | I | I | C | R |
| Middleware Tenant (LMSK-12) | I | A | R | I | I | I | C |
| Architecture AWS (IaC Terraform) | C | A | I | I | R | I | C |
| Pipeline CI/CD | I | C | C | C | R | A | C |
| Modules Core Backend | I | A | R | C | I | C | C |
| Modules Frontend Next.js | I | A | C | R | I | C | I |
| Module Consent / Audit (Loi 25) | A | C | R | C | I | C | R |
| Plan de tests & QA | C | C | C | C | I | R | C |
| Audit sécurité & pentest | A | C | C | I | C | C | R |
| Validation WCAG 2.1 AA | I | C | I | R | I | R | I |
| Go/No-go Go-live | A | C | C | C | C | C | C |
| Communication clients pilotes | R | I | I | I | I | I | I |

---

## 5. Livrables — par sprint et phase

### Sprint 01 — Foundation : DB + Auth (2026-02-26 → 2026-03-12)

| ID | Livrable | Critère d'acceptation |
|----|----------|----------------------|
| LMSK-9 | Schéma Prisma v1 (Tenant, User, Consent, AuditLog) | Migration `prisma migrate deploy` réussie, seed de test OK |
| LMSK-10 | Migrations RLS PostgreSQL | Politique RLS validée par Lead Sécurité, test d'isolation inter-tenant passant |
| LMSK-11 | AuthGuard Keycloak JWT/JWKS | Validation token JWKS, rejet token invalide, test avec 5 rôles |
| LMSK-12 | Middleware extraction subdomain tenant | Mapping `org1.lms.example.com` → `tenantId` validé, 404 si tenant inconnu |
| — | Environnement AWS ca-central-1 (dev) | VPC, RDS, ElastiCache, ECS cluster provisionnés via Terraform |
| — | Pipeline CI GitHub Actions (lint, test, build) | Pipeline vert sur PR merge vers `main` |

### Sprint 02 — Core Modules (2026-03-13 → 2026-03-27)

| ID | Livrable | Critère d'acceptation |
|----|----------|----------------------|
| LMSK-13 | Module User (CRUD + rôles) | API REST documentée Swagger, tests unitaires ≥ 80 % |
| LMSK-14 | Module Course (création, publication) | Création cours multi-sections, statuts draft/published |
| LMSK-15 | Module Enrollment (inscription + prérequis) | Inscription apprenant, vérification prérequis, liste d'attente |
| LMSK-16 | Module Consent (Loi 25) | Collecte, révocation, historique, base légale par traitement |
| LMSK-17 | Package @lms/audit (hash chain SHA-256) | 0 rupture de chaîne sur 10 000 events de test, export signé |
| LMSK-18 | Module Notification (email SES + in-app) | Template FR/EN, delivery rate > 99 % sur environnement de staging |

### Sprint 03 — Frontend + UX (2026-03-28 → 2026-04-11)

| ID | Livrable | Critère d'acceptation |
|----|----------|----------------------|
| LMSK-19 | Design system (composants Radix UI + Tailwind) | Storybook publié, conformité WCAG 2.1 AA ≥ 100 % core components |
| LMSK-20 | Dashboard LEARNER (Next.js 14 App Router) | Affichage cours inscrits, progression, notifications |
| LMSK-21 | Dashboard INSTRUCTOR (gestion cours, notes) | CRUD cours, visualisation progression apprenants |
| LMSK-22 | Dashboard TENANT_ADMIN (analytics, users) | Tableaux de bord, gestion utilisateurs, export données |
| LMSK-23 | Page Consentement (Loi 25 UX) | Formulaire conforme, audit visuel validation CPPQ |
| LMSK-24 | Module Assessment Frontend (quiz, devoirs) | Prise en main en < 3 minutes (test utilisateur) |

### Sprint 04 — Intégrations + CI complet (2026-04-12 → 2026-04-26)

| ID | Livrable | Critère d'acceptation |
|----|----------|----------------------|
| LMSK-25 | Import SCORM 1.2 / 2004 | 10 packages SCORM de référence importés et joués sans erreur |
| LMSK-26 | SSO SAML2 (Keycloak IdP externe) | Fédération avec Active Directory testé sur un tenant pilote |
| LMSK-27 | Plugin system KernelModule | onInit/onReady/onDestroy fonctionnels, exemple plugin documenté |
| LMSK-28 | Gate CI WCAG axe-core | Pipeline bloquant si violation critique, rapport automatique |
| LMSK-29 | Gate CI couverture tests | Pipeline bloquant si couverture < seuil (80 % backend, 70 % front) |
| LMSK-30 | Environnement staging AWS (miroir production) | Déploiement automatique depuis branche `release/*` |

### Sprint 05 — Beta Interne (2026-04-27 → 2026-05-11)

| ID | Livrable | Critère d'acceptation |
|----|----------|----------------------|
| LMSK-31 | Onboarding 1 tenant pilote | Institution pilote en production sur staging, 50 apprenants actifs |
| LMSK-32 | Rapport d'audit sécurité (pentest interne) | 0 vulnérabilité critique ou haute non-corrigée |
| LMSK-33 | Rapport de performance (k6 load test) | p95 < 200 ms à 100 req/s, p99 < 500 ms |
| LMSK-34 | Rapport conformité Loi 25 | Checklist Loi 25 validée par Isabelle Chen, aucun point bloquant |
| LMSK-35 | Documentation utilisateur FR (guides rôles) | Guides LEARNER, INSTRUCTOR, TENANT_ADMIN livrés et relus |

### Sprint 06 — Release Candidate (2026-05-12 → 2026-05-26)

| ID | Livrable | Critère d'acceptation |
|----|----------|----------------------|
| LMSK-36 | Release Candidate v1.0.0-rc.1 taggée | Tag git signé, artefacts Docker publiés sur ECR |
| LMSK-37 | Runbook opérationnel | Procédures démarrage, arrêt, rollback, backup documentées |
| LMSK-38 | Plan de reprise d'activité (PRA) testé | RTO < 4h, RPO < 1h, test DR validé en staging |
| LMSK-39 | Audit final Loi 25 + WCAG | Rapport signé par Isabelle Chen, 0 non-conformité critique |
| LMSK-40 | Go/No-go meeting | Décision formelle documentée, signée par la CTO |

### Go-live — 2026-06-01

- Déploiement production AWS ca-central-1
- Activation DNS clients pilotes (2 à 3 tenants)
- Monitoring 24/7 activé (CloudWatch + PagerDuty)
- Support niveau 1 opérationnel

---

## 6. Jalons et Planning

| Jalon | Date | Description | Critère de sortie |
|-------|------|-------------|-------------------|
| J1 — Kickoff | 2026-02-26 | Démarrage Sprint 01, équipe constituée | Charte signée, environnement dev opérationnel |
| J2 — Foundation Done | 2026-03-12 | Fin Sprint 01 : DB + Auth opérationnels | LMSK-9 à 12 acceptés, pipeline CI vert |
| J3 — Core Done | 2026-03-27 | Fin Sprint 02 : modules métier livrés | 6 modules backend acceptés, couverture ≥ 80 % |
| J4 — Frontend Done | 2026-04-11 | Fin Sprint 03 : interfaces utilisateurs livrées | 4 dashboards fonctionnels, WCAG vert |
| J5 — Integration Done | 2026-04-26 | Fin Sprint 04 : CI complet + intégrations | Gates CI actives, SCORM validé, plugin system OK |
| J6 — Beta Interne | 2026-05-11 | Fin Sprint 05 : tenant pilote actif | 50 apprenants actifs, pentest 0 critique |
| J7 — Release Candidate | 2026-05-26 | Fin Sprint 06 : RC taguée et validée | Tag v1.0.0-rc.1, audit Loi 25 signé |
| J8 — Go-live | 2026-06-01 | Mise en production commerciale | DNS actifs, monitoring opérationnel, SLA ≥ 99,5 % |

```
2026-02  ▌Sprint 01 : Foundation (DB+Auth)
2026-03  ▌──────────────────────▌Sprint 02 : Core Modules
2026-03  ▌────────────────────────────────▌Sprint 03 : Frontend
2026-04  ▌──────────────────────────────────────────▌Sprint 04 : CI+Intégrations
2026-04  ▌────────────────────────────────────────────────────▌Sprint 05 : Beta
2026-05  ▌──────────────────────────────────────────────────────────▌Sprint 06 : RC
2026-06  ▌ GO-LIVE 2026-06-01
```

---

## 7. Budget — Estimation

### 7.1 Ressources humaines (16 semaines, ~3,5 mois)

| Poste | Taux journalier (CAD) | Jours estimés | Coût estimé (CAD) |
|-------|-----------------------|---------------|-------------------|
| CTO / Alexandra Dupont (supervision, architecture, PM) | 1 200 | 60 | 72 000 |
| Architecte / Thomas Martin | 1 100 | 70 | 77 000 |
| Lead Backend (Senior NestJS) | 950 | 75 | 71 250 |
| Lead Frontend (Senior Next.js) | 900 | 70 | 63 000 |
| Lead DevOps (AWS, Terraform, CI/CD) | 950 | 60 | 57 000 |
| Lead QA (automatisation, accessibilité) | 850 | 65 | 55 250 |
| Lead Sécurité / Isabelle Chen (audit, conformité) | 1 050 | 40 | 42 000 |
| **Sous-total RH** | | | **437 500** |

### 7.2 Infrastructure et services (6 mois de projet)

| Poste | Coût mensuel estimé (CAD) | Durée | Total (CAD) |
|-------|--------------------------|-------|-------------|
| AWS ca-central-1 (ECS, RDS, ElastiCache, ALB, WAF) | 3 200 | 6 mois | 19 200 |
| AWS SES (emails notifications) | 150 | 6 mois | 900 |
| Keycloak (self-hosted ECS, inclus dans AWS) | 0 | — | 0 |
| GitHub Enterprise (5 licences) | 230 | 6 mois | 1 380 |
| Jira + Confluence (Atlassian Cloud) | 120 | 6 mois | 720 |
| Outils QA / accessibilité (Deque axe DevTools Pro) | 180 | 6 mois | 1 080 |
| PagerDuty (alerting on-call) | 200 | 6 mois | 1 200 |
| Datadog (monitoring APM, logs) | 800 | 6 mois | 4 800 |
| **Sous-total Infrastructure** | | | **29 280** |

### 7.3 Autres coûts

| Poste | Montant (CAD) |
|-------|---------------|
| Audit sécurité externe (pentest partiel Sprint 05) | 12 000 |
| Conseil juridique Loi 25 (avocat spécialisé, 10h) | 6 500 |
| Formation équipe (NestJS advanced, Keycloak admin) | 4 500 |
| Licences logicielles et outils divers | 2 500 |
| Réserve pour aléas (10 % du total) | 49 230 |
| **Sous-total Autres** | | 
| | **74 730** |

### 7.4 Résumé budgétaire

| Catégorie | Montant (CAD) |
|-----------|---------------|
| Ressources humaines | 437 500 |
| Infrastructure et services | 29 280 |
| Autres coûts et conseil | 31 500 |
| Réserve pour aléas (10 %) | 49 830 |
| **TOTAL PROJET** | **548 110** |

> Note : Le budget est exprimé en CAD TTC hors taxes de vente (TVQ/TPS applicables selon les entités). La réserve d'aléas couvre les dépassements liés à la complexité de la conformité Loi 25 ou aux découvertes de sécurité en Sprint 05.

---

## 8. Risques

| # | Risque | Probabilité | Impact | Score | Mitigation | Responsable |
|---|--------|-------------|--------|-------|------------|-------------|
| R1 | Évolution réglementaire Loi 25 (nouvelles directives CAI) | Faible | Élevé | 6 | Veille mensuelle CAI, architecture consent extensible, conseil juridique en retainer | Isabelle Chen |
| R2 | Complexité RLS PostgreSQL + Prisma (bugs isolation) | Moyenne | Critique | 9 | Tests d'isolation inter-tenant automatisés dans CI, revue de code systématique, Thomas Martin en reviewer obligatoire | Thomas Martin |
| R3 | Dérive du périmètre (scope creep) demandée par client pilote | Élevée | Moyen | 8 | Charte de projet signée, backlog verrouillé par CTO, nouvelle feature → Sprint 07+ | Alexandra Dupont |
| R4 | Disponibilité ressource (Lead Backend non encore recruté) | Élevée | Élevé | 10 | Recrutement prioritaire semaine du 2026-02-28, contingence : Thomas Martin assure l'intérim Backend Sprint 01 | Alexandra Dupont |
| R5 | Vulnérabilité sécurité découverte en Sprint 05 (pentest) | Moyenne | Critique | 9 | Pentest planifié 2 semaines avant RC, buffer correctif intégré dans Sprint 06 | Isabelle Chen |
| R6 | Panne critique AWS ca-central-1 (région unique) | Faible | Critique | 6 | PRA documenté, backups cross-AZ, procédure failover testée en Sprint 06 | Lead DevOps |
| R7 | Difficultés d'intégration SCORM 2004 (edge cases) | Moyenne | Moyen | 6 | POC SCORM dès Sprint 02, librairie scorm-again validée, 10 packages de test de référence | Lead Backend |
| R8 | Non-conformité WCAG 2.1 AA sur composants complexes | Moyenne | Élevé | 8 | Gate CI axe-core bloquante dès Sprint 04, Lead Frontend formé accessibilité, audit manuel Sprint 06 | Lead QA |
| R9 | Performance insuffisante sous charge (latence > 200 ms) | Faible | Élevé | 5 | Load tests k6 dès Sprint 04, query analyzer Prisma, index PostgreSQL revus par Thomas Martin | Lead Backend |
| R10 | Rupture de la chaîne d'audit SHA-256 (bug @lms/audit) | Faible | Critique | 6 | Tests de régression 10 000 events, code package audité par Isabelle Chen, immutabilité base garantie par RLS | Isabelle Chen |

**Matrice de score** : Probabilité (Faible=1, Moyenne=2, Élevée=3) × Impact (Moyen=2, Élevé=3, Critique=4)

---

## 9. Dépendances

| Dépendance | Type | Impact si non disponible | Mitigation |
|------------|------|--------------------------|------------|
| **Keycloak 24** (IDP central) | Technique externe | Blocage complet Auth + SSO | Image Docker officielle, déploiement self-hosted ECS, pas de dépendance cloud tiers |
| **AWS ca-central-1** | Infrastructure | Blocage déploiement, non-conformité Loi 25 si migration région | SLA AWS 99,99 %, multi-AZ, pas de région de secours (contrainte Loi 25 acceptée) |
| **PostgreSQL 16 RDS** | Infrastructure | Perte données, blocage DB | RDS Multi-AZ, snapshots quotidiens, PITR 7 jours |
| **Prisma ORM** | Technique | Blocage modélisation données | Prisma est open-source, version fixée dans package.json, fork possible |
| **Redis 7 / BullMQ** | Technique | Perte cache + file de jobs | ElastiCache Redis Multi-AZ, BullMQ avec retry automatique |
| **Loi 25 (cadre réglementaire)** | Légal | Non-conformité → risque sanctions CAI jusqu'à 25 M CAD | Architecture pensée conformité dès le jour 1, conseil juridique externe |
| **Tenant pilote (institution)** | Business | Retard validation Sprint 05 | Accord de principe avec 2 institutions ciblées, convention signée avant Sprint 04 |
| **GitHub Actions** (CI/CD) | Outillage | Blocage déploiements automatisés | Workflows exportables, migration GitLab CI possible en < 1 semaine |
| **AWS SES** (notifications) | Technique | Blocage envoi emails | Quota SES augmenté dès Sprint 02, fallback SMTP configuré |
| **Recrutement Lead Backend, Frontend, DevOps, QA** | RH | Retard livraison Sprint 01-02 | Recrutement en cours, Thomas Martin en backup Sprint 01 |

---

## 10. Hypothèses

1. **Recrutement** : Les quatre postes de Lead (Backend, Frontend, DevOps, QA) seront pourvus d'ici la fin de la semaine du 2026-02-28, permettant une pleine capacité dès Sprint 02.
2. **Stack technique fixe** : La stack (NestJS, Next.js, Keycloak, PostgreSQL, Redis) est définitivement arrêtée et ne sera pas remise en question durant le projet.
3. **Région AWS** : La contrainte de résidence des données en ca-central-1 est non négociable et s'applique à l'intégralité des données personnelles des tenants.
4. **Keycloak autogéré** : Keycloak est hébergé en self-hosted sur l'infrastructure AWS de Diofevre ; aucune dépendance à un service Keycloak-as-a-Service tiers.
5. **Institution pilote** : Au moins une institution éducative québécoise s'engage contractuellement à participer à la beta interne (Sprint 05) avant le démarrage de Sprint 03.
6. **Budget approuvé** : Le budget de 548 110 CAD est approuvé par la direction de Diofevre avant le kickoff du 2026-02-26.
7. **Périmètre stable** : Le périmètre de la version 1.0 est gelé à compter de la signature de cette charte. Toute nouvelle fonctionnalité est backlogée pour la Phase 2.
8. **Disponibilité Isabelle Chen** : Le Lead Sécurité est disponible à hauteur de 40 % de son temps sur la durée du projet, avec des pics en Sprint 01 (RLS), Sprint 05 (pentest) et Sprint 06 (audit final).
9. **Cadre Loi 25** : La Commission d'accès à l'information du Québec (CAI) ne publie pas de nouvelles directives substantiellement différentes de celles en vigueur au 2026-02-28 durant la période de développement.
10. **Outillage** : L'ensemble de l'équipe dispose d'accès GitHub, Jira et AWS configurés et opérationnels au démarrage du Sprint 01.

---

## 11. Critères de Succès

Le projet LMS Kernel v1.0 est considéré comme un succès si, au 2026-07-01 (un mois post Go-live), tous les critères suivants sont satisfaits :

| Critère | Mesure | Seuil de succès |
|---------|--------|-----------------|
| **Livraison dans les délais** | Date Go-live effective | ≤ 2026-06-01 |
| **Livraison dans le budget** | Dépenses réelles vs. budget approuvé | ≤ 548 110 CAD (± 5 % tolérance) |
| **Qualité logicielle** | Défauts P0/P1 en production 30 jours post-go-live | 0 P0, ≤ 3 P1 |
| **Conformité Loi 25** | Rapport d'audit signé, 0 non-conformité critique | Validé par Isabelle Chen et conseil juridique |
| **Accessibilité WCAG** | Audit manuel + axe-core | 0 violation de niveau A ou AA |
| **Performance** | p95 API en production sous charge réelle | < 200 ms |
| **Disponibilité** | Uptime premier mois de production | ≥ 99,5 % |
| **Adoption beta** | Tenants actifs avec apprenants réels | ≥ 2 tenants, ≥ 100 apprenants actifs |
| **Satisfaction équipe** | Rétrospective finale (échelle 1-5) | Score moyen ≥ 4,0/5 |
| **Audit trail** | Intégrité hash chain @lms/audit | 0 rupture détectée sur 30 jours de production |

---

## 12. Signatures

En signant ce document, les signataires attestent avoir pris connaissance de la Charte de Projet LMS Kernel v1.0, en approuvent le contenu et s'engagent à respecter les objectifs, le périmètre, le planning et le budget qui y sont définis.

| Rôle | Nom | Signature | Date |
|------|-----|-----------|------|
| CTO (Auteur et Approbatrice) | Alexandra Dupont | *(signature électronique)* | 2026-02-28 |
| Architecte | Thomas Martin | *(signature électronique)* | 2026-02-28 |
| Lead Sécurité | Isabelle Chen | *(signature électronique)* | 2026-02-28 |
| Représentant Direction Diofevre | *(à compléter)* | *(signature électronique)* | 2026-02-28 |

> Document versionné et archivé dans le repo GitHub de Diofevre : https://github.com/Diofevre/lms-kernel/docs/charter-v1.0.md
> Référence Jira : LMSK — Epic LMSK-1 (Project Foundation)