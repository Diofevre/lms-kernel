# Guide de lancement des agents — LMS Kernel
# =============================================================================
# Pour le propriétaire du repo — comment démarrer chaque agent Cursor Cloud
# et ce que les agents peuvent faire via GitHub CLI.
#
# IMPORTANT : Les agents Cursor Cloud n'ont accès qu'à GitHub.
#   → Toute la documentation DOIT être dans ce repo.
#   → Les agents utilisent `gh` CLI pour lire docs + créer PRs.
#   → Jira/Confluence : les agents lisent agents/context/SPRINT_01_BACKLOG.md
# =============================================================================

## Prérequis pour lancer un agent

### Infrastructure automatique (Codespace)

Quand un agent ouvre ce repo dans un Codespace GitHub, TOUT démarre automatiquement :

```
✅ PostgreSQL     → localhost:5432  (docker-compose)
✅ Redis          → localhost:6379  (docker-compose)
✅ Keycloak       → localhost:8080  (docker-compose — dev mode)
✅ .env           → copié depuis .env.codespace automatiquement
```

**Aucun compte AWS, Bitwarden, ou clé API externe n'est nécessaire pour écrire du code.**

---

## Ordre d'exécution des missions (RESPECTER ABSOLUMENT)

```
ÉTAPE 0 (humain)
  → pnpm install dans le Codespace
  → commit pnpm-lock.yaml sur develop
  → Ticket : LMSK-13

ÉTAPE 1 (agent Cursor — Mission 01)
  → Branch : feature/01-database-schema
  → Tickets : LMSK-9, LMSK-10 + sous-tâches LMSK-14 à LMSK-23
  → Prérequis : LMSK-13 mergé sur develop

ÉTAPE 2 (agent Cursor — Mission 02)
  → Branch : feature/02-auth-middleware
  → Tickets : LMSK-11, LMSK-12 + sous-tâches LMSK-24 à LMSK-31
  → Prérequis : PR Mission 01 mergée sur develop
```

---

## Comment les agents Cursor lisent la documentation via `gh` CLI

Les agents Cursor Cloud ont accès au GitHub CLI (`gh`). Ils peuvent lire tous
les fichiers du repo directement depuis le terminal du Codespace.

### Commandes `gh` utiles pour les agents

```bash
# Lire le backlog Sprint 01 (état des tickets, ordre d'exécution)
gh api repos/Diofevre/lms-kernel/contents/agents/context/SPRINT_01_BACKLOG.md \
  --jq '.content' | base64 -d

# Lire les standards de code (OBLIGATOIRE avant d'écrire la première ligne)
gh api repos/Diofevre/lms-kernel/contents/agents/context/CODING_STANDARDS.md \
  --jq '.content' | base64 -d

# Lire une mission spécifique
gh api repos/Diofevre/lms-kernel/contents/agents/missions/01-setup-database.md \
  --jq '.content' | base64 -d

gh api repos/Diofevre/lms-kernel/contents/agents/missions/02-implement-auth.md \
  --jq '.content' | base64 -d

# Vérifier les PRs existantes sur develop
gh pr list --base develop --state open

# Créer une PR depuis l'agent
gh pr create \
  --title "feat(db): Prisma schema + RLS — Mission 01 [LMSK-9, LMSK-10]" \
  --body-file .pr-body.md \
  --base develop \
  --label "ai-generated"

# Voir les branches existantes
gh api repos/Diofevre/lms-kernel/branches --jq '.[].name'
```

---

## Mission 01 — Prisma Schema + RLS

### Tickets Jira couverts
- **LMSK-9** : Schéma Prisma (Tenant, User, Consent, AuditLog)
- **LMSK-10** : Migrations RLS (Row Level Security)
- **LMSK-14 à LMSK-23** : Sous-tâches détaillées

### Prérequis à vérifier avant de démarrer

```bash
# 1. pnpm-lock.yaml existe sur develop ?
gh api repos/Diofevre/lms-kernel/contents/pnpm-lock.yaml --jq '.name'
# → Si 404 : STOP — attendre que l'humain fasse pnpm install

# 2. Branch develop est à jour ?
gh api repos/Diofevre/lms-kernel/branches/develop --jq '.commit.sha'

# 3. Pas de PR en cours sur feature/01-database-schema ?
gh pr list --head feature/01-database-schema
```

### Prompt exact à donner à l'agent

```
Tu es un agent Cursor Cloud travaillant sur le repo LMS Kernel (github.com/Diofevre/lms-kernel).
Tu n'as accès qu'à GitHub et au Codespace.

ÉTAPE 0 — Lire la documentation :
  gh api repos/Diofevre/lms-kernel/contents/agents/context/CODING_STANDARDS.md --jq '.content' | base64 -d
  gh api repos/Diofevre/lms-kernel/contents/agents/context/SPRINT_01_BACKLOG.md --jq '.content' | base64 -d
  gh api repos/Diofevre/lms-kernel/contents/agents/missions/01-setup-database.md --jq '.content' | base64 -d

ÉTAPE 1 — Créer la branche depuis develop :
  git checkout develop && git pull
  git checkout -b feature/01-database-schema

ÉTAPE 2 — Implémenter exactement ce qui est décrit dans la mission 01.

ÉTAPE 3 — Valider avant de créer la PR :
  pnpm prisma validate
  pnpm typecheck
  pnpm lint
  pnpm test --coverage (couverture >= 80%)

ÉTAPE 4 — Créer la PR avec le bon format (voir section "Format PR" ci-dessous).

RÈGLES ABSOLUES :
- Jamais de hard delete (uniquement deletedAt)
- Jamais de console.log (utiliser Logger NestJS)
- Jamais de `any` TypeScript
- Chaque commit doit mentionner le ticket Jira : feat(db): add Tenant model [LMSK-9]
- CHANGELOG.md section [Unreleased] doit être mis à jour
```

---

## Mission 02 — AuthGuard Keycloak + Middleware Tenant

### Tickets Jira couverts
- **LMSK-11** : AuthGuard Keycloak (validation JWT via JWKS)
- **LMSK-12** : Middleware tenant (extraction subdomain + lookup DB)
- **LMSK-24 à LMSK-31** : Sous-tâches détaillées

### Prérequis à vérifier avant de démarrer

```bash
# 1. PR Mission 01 est bien mergée sur develop ?
gh pr list --base develop --state merged --search "Mission 01"

# 2. Package @lms/db existe dans packages/db/ ?
gh api repos/Diofevre/lms-kernel/contents/packages/db/package.json --jq '.name'

# 3. types.ts IAM existe ?
gh api repos/Diofevre/lms-kernel/contents/packages/iam/src/types.ts --jq '.name'
```

### Prompt exact à donner à l'agent

```
Tu es un agent Cursor Cloud travaillant sur le repo LMS Kernel (github.com/Diofevre/lms-kernel).
Tu n'as accès qu'à GitHub et au Codespace.

ÉTAPE 0 — Lire la documentation :
  gh api repos/Diofevre/lms-kernel/contents/agents/context/CODING_STANDARDS.md --jq '.content' | base64 -d
  gh api repos/Diofevre/lms-kernel/contents/agents/context/SPRINT_01_BACKLOG.md --jq '.content' | base64 -d
  gh api repos/Diofevre/lms-kernel/contents/agents/missions/02-implement-auth.md --jq '.content' | base64 -d

ÉTAPE 1 — Créer la branche depuis develop :
  git checkout develop && git pull
  git checkout -b feature/02-auth-middleware

ÉTAPE 2 — Vérifier que la PR Mission 01 est bien mergée (packages/db doit exister).

ÉTAPE 3 — Implémenter exactement ce qui est décrit dans la mission 02.

ÉTAPE 4 — Valider avant de créer la PR :
  pnpm typecheck
  pnpm lint
  pnpm test --coverage (couverture >= 80%)
  Vérifier : 5 tests AuthGuard + 4 tests Middleware passent ✅

ÉTAPE 5 — Créer la PR avec le bon format (voir section "Format PR" ci-dessous).

RÈGLES ABSOLUES :
- Jamais de hard delete (uniquement deletedAt)
- Jamais de console.log (utiliser Logger NestJS)
- Jamais de `any` TypeScript
- Chaque commit doit mentionner le ticket Jira : feat(auth): add AuthGuard Keycloak [LMSK-11]
- CHANGELOG.md section [Unreleased] doit être mis à jour
```

---

## Format PR obligatoire (pour TOUTES les missions)

```markdown
## Tickets Jira
- LMSK-X : Description courte
- LMSK-Y : Description courte

## Fichiers créés/modifiés
- path/to/file1.ts
- path/to/file2.ts

## Tests
- [ ] pnpm typecheck ✅
- [ ] pnpm lint ✅
- [ ] pnpm test (couverture > 80%) ✅

## Checklist compliance
- [ ] Aucun hard delete
- [ ] tenantId sur toutes les tables
- [ ] Aucun console.log
- [ ] Aucun `any` TypeScript
- [ ] CHANGELOG.md mis à jour
```

**Commande pour créer la PR :**
```bash
# Sauvegarder le corps dans un fichier temporaire
cat > /tmp/pr-body.md << 'EOF'
## Tickets Jira
...
EOF

gh pr create \
  --title "feat(db): Prisma schema + RLS — Mission 01 [LMSK-9, LMSK-10]" \
  --body-file /tmp/pr-body.md \
  --base develop \
  --label "ai-generated"
```

---

## Format de commits (Conventional Commits + Jira)

```
feat(scope):  description courte [TICKET]
fix(scope):   correction courte [TICKET]
test(scope):  ajout/modif tests [TICKET]
chore(scope): mise à jour tooling [TICKET]

Exemples :
  feat(db): add Tenant model with RLS [LMSK-9]
  feat(db): add migration 001_init_rls [LMSK-10]
  test(db): add Prisma integration tests [LMSK-23]
  feat(auth): add AuthGuard Keycloak JWT [LMSK-11]
  feat(auth): add @Roles() and @Public() decorators [LMSK-25, LMSK-26]
  feat(middleware): add TenantMiddleware subdomain extraction [LMSK-12]
  test(auth): add 5 AuthGuard unit tests Gherkin [LMSK-27]
```

---

## Ce que l'agent PEUT faire

```
✅ Lire tout fichier du repo via gh API ou directement dans le Codespace
✅ Écrire du code TypeScript (NestJS, Next.js, Prisma)
✅ Créer des modules, controllers, services, guards, middleware
✅ Écrire des schémas Prisma et des migrations SQL
✅ Écrire des tests unitaires avec Vitest (mocks)
✅ pnpm typecheck + pnpm lint + pnpm test
✅ git commit + git push
✅ Créer des PRs vers develop via gh pr create
✅ Lire la doc depuis GitHub via gh api (SPRINT_01_BACKLOG, CODING_STANDARDS, missions)
✅ Installer des dépendances npm/pnpm si requises par la mission
```

## Ce que l'agent NE DOIT PAS faire

```
❌ Hard delete — uniquement soft delete via deletedAt
❌ Stocker des mots de passe — auth déléguée à Keycloak
❌ Utiliser `any` TypeScript
❌ Utiliser `console.log` — utiliser Logger NestJS
❌ Hardcoder des URLs, credentials, couleurs
❌ Modifier .github/workflows/ — réservé aux humains
❌ Modifier packages/audit/, packages/iam/, packages/compliance/ sans mission explicite
❌ Committer node_modules/, .env, fichiers binaires
❌ Pusher directement sur develop ou main
❌ Merger sa propre PR — l'humain valide et merge
❌ Appels API externes (S3, services cloud) — Phase 2 seulement
❌ Deploy en staging ou prod
❌ Exécuter des migrations sur une base de données de production
```

---

## Vérifier que le Codespace est prêt (agent doit faire ces checks)

```bash
# Services up ?
docker compose ps

# DB connectée ?
pnpm --filter=@lms/db exec prisma db push --accept-data-loss

# Typecheck OK ?
pnpm typecheck

# Lint OK ?
pnpm lint

# Tests OK ?
pnpm test
```

Si une commande échoue → **l'agent doit s'arrêter et créer une issue GitHub**, pas forcer.

---

## Variables d'environnement disponibles dans le Codespace

Ces variables sont dans `.env.codespace` — déjà présentes, ne pas modifier :

```bash
DATABASE_URL="postgresql://lms:lms@postgres:5432/lms_dev"
DATABASE_URL_SHADOW="postgresql://lms:lms@postgres:5432/lms_shadow"
KEYCLOAK_URL="http://keycloak:8080"
KEYCLOAK_REALM="lms"
KEYCLOAK_CLIENT_ID="lms-api"
NODE_ENV="development"
DEV_TENANT_ID="dev-tenant-id"
```

---

## Workflow d'approbation humaine

```
Agent crée PR  →  GitHub envoie notification  →  Humain review le code
                                                        ↓
                                              ✅ Approve + Merge
                                                   OU
                                              ❌ Request Changes → Agent corrige
```

**L'agent NE merge jamais sa propre PR.**
**L'humain est le seul à merger sur develop.**
