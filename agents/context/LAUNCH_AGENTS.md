# Comment lancer un agent sur ce projet

> Pour le propriétaire du repo — instructions pour démarrer un agent Cursor ou Claude Code.

## Prérequis ZÉRO externe nécessaire en Phase 1

Quand un agent ouvre ce repo dans un Codespace :
- PostgreSQL démarre automatiquement (docker-compose)
- Redis démarre automatiquement (docker-compose)
- Keycloak démarre automatiquement (docker-compose — dev mode)
- `.env.codespace` est copié vers `.env` automatiquement

**Aucun compte AWS, Bitwarden, ou clé API externe n'est nécessaire pour écrire du code.**

---

## Lancer un agent Cursor

1. Ouvre [github.com/Diofevre/lms-kernel](https://github.com/Diofevre/lms-kernel)
2. **Code → Codespaces → New codespace on develop**
3. Attends que le container soit prêt (~3-5 min, services démarrent)
4. Dans Cursor : **File → Open Remote → Codespace → lms-kernel**
5. Donne à l'agent le contenu du fichier mission voulu :
   - Mission 01 : `agents/missions/01-setup-database.md`
   - Mission 02 : `agents/missions/02-implement-auth.md`
   - Mission 03 : `agents/missions/03-implement-courses-video.md`
6. L'agent doit lire `agents/context/AGENT_ONBOARDING.md` en premier

## Prompt de démarrage pour un agent (à copier)

```
Tu travailles sur le repo LMS Kernel.
Lis d'abord ces fichiers dans l'ordre :
1. agents/context/AGENT_ONBOARDING.md
2. ARCHITECTURE.md
3. MODULE_CONTRACT.md
4. agents/missions/[NUMÉRO]-[NOM].md

Ensuite exécute la mission décrite.
Crée une branche feature/[description-courte], travaille dessus,
puis crée une PR vers develop quand tu as fini.
Label la PR comme "ai-generated".
```

---

## Ce que l'agent PEUT faire sans infrastructure externe

- ✅ Écrire du code TypeScript (NestJS, Next.js)
- ✅ Créer des modules, controllers, services
- ✅ Écrire des schémas Prisma
- ✅ Écrire des tests unitaires (mocks)
- ✅ `pnpm typecheck` + `pnpm lint`
- ✅ Créer des PRs

## Ce que l'agent NE PEUT PAS faire encore (Phase 2)

- ❌ Appels API externes (S3, services cloud)
- ❌ Tests E2E complets (CI staging)
- ❌ Deploy en staging ou prod

---

## Vérifier que le Codespace est prêt

Dans le terminal du Codespace :
```bash
# Services up ?
docker compose ps

# DB connectée ?
pnpm --filter=@lms/api run db:migrate

# Typecheck OK ?
pnpm typecheck

# Lint OK ?
pnpm lint
```

Si tout passe : l'agent peut travailler.
