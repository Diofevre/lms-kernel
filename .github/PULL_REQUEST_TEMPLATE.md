# Pull Request

## Type de changement
- [ ] `feat` — nouvelle fonctionnalité
- [ ] `fix` — correction de bug
- [ ] `chore` — maintenance, dépendances
- [ ] `docs` — documentation uniquement
- [ ] `refactor` — refactorisation sans changement fonctionnel
- [ ] `security` — correctif de sécurité
- [ ] `ai-generated` — code généré par un agent IA (Cursor, Claude, Codex)

## Description
<!-- Décris clairement ce que fait ce PR -->

## Lié à
<!-- Closes #ISSUE_NUMBER -->

---

## Checklist développeur

### Code
- [ ] Le code compile sans erreurs TypeScript (`pnpm typecheck`)
- [ ] Lint passe sans erreurs (`pnpm lint`)
- [ ] Tests unitaires passent et couvrent les nouveaux chemins (`pnpm test`)
- [ ] Aucun secret / clé API dans le code (Gitleaks vérifie automatiquement)
- [ ] Aucun `console.log` ou `TODO` laissé sans issue

### Sécurité
- [ ] Aucune donnée personnelle stockée sans `tenant_id` et `consent_id`
- [ ] Toute nouvelle route API est protégée par un Guard Keycloak
- [ ] Les entrées utilisateur sont validées avec des DTOs (class-validator)
- [ ] Aucune dépendance ajoutée sans vérification de licence et vulnérabilités

### Conformité Loi 25 (si applicable)
- [ ] Aucune nouvelle collecte de données personnelles sans consentement explicite
- [ ] Politique de rétention déclarée pour toute nouvelle entité avec PII
- [ ] ÉFVP (Évaluation des facteurs relatifs à la vie privée) mise à jour si nécessaire

### Accessibilité WCAG AA (si changement frontend)
- [ ] Composants Shadcn/Radix utilisés (accessibles par défaut)
- [ ] Navigation clavier testée manuellement
- [ ] Labels ARIA présents sur tous les éléments interactifs
- [ ] Contraste couleurs respecté (ratio 4.5:1 minimum)
- [ ] Test axe-core passe (`pnpm test:wcag`)

### Base de données (si migration Prisma)
- [ ] Migration testée en sens inverse (rollback possible)
- [ ] Aucune donnée supprimée de façon irréversible sans sauvegarde confirmée
- [ ] RLS (Row Level Security) maintenu pour le multi-tenant

### Secrets (Bitwarden Secrets Manager)
- [ ] Aucun secret hardcodé — tous les secrets passent par `bws secret get`
- [ ] Toute nouvelle variable de secret documentée dans `.env.example`
- [ ] Secret ajouté dans Bitwarden SM ET dans GitHub Secrets si utilisé en CI

---

## Pour les reviewers

**Si ce PR est marqué `ai-generated`** :
- [ ] Vérifier que le code ne contient pas de logique cachée ou inattendue
- [ ] Vérifier que les tests ne sont pas triviaux
- [ ] Vérifier l'absence de dépendances non approuvées

**Temps de quarantaine minimum avant merge dans `staging`** : 24h après approbation
