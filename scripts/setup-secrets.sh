#!/usr/bin/env bash
# =============================================================================
# setup-secrets.sh — Configuration sécurisée des GitHub Secrets
# LMS Kernel — Diofevre/lms-kernel
#
# USAGE : bash scripts/setup-secrets.sh
#
# Ce script vous demande chaque valeur de manière interactive.
# Les secrets ne sont JAMAIS affichés, copiés dans des fichiers ou loggés.
# Ils sont envoyés directement à GitHub via gh CLI.
# =============================================================================

set -euo pipefail

REPO="Diofevre/lms-kernel"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
BOLD="\033[1m"
RESET="\033[0m"

# =============================================================================
# FONCTIONS
# =============================================================================

check_deps() {
  echo -e "\n${BOLD}Vérification des prérequis...${RESET}"
  if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗ gh CLI non installé. Installer : https://cli.github.com${RESET}"
    exit 1
  fi
  if ! gh auth status &> /dev/null; then
    echo -e "${RED}✗ gh CLI non authentifié. Lancer : gh auth login${RESET}"
    exit 1
  fi
  echo -e "${GREEN}✓ gh CLI installé et authentifié${RESET}"
  echo -e "${GREEN}✓ Repo cible : ${REPO}${RESET}"
}

section() {
  echo -e "\n${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BLUE}${BOLD}  $1${RESET}"
  echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

# Demande une valeur de manière sécurisée (invisible à la frappe)
# Usage : set_secret "NOM_SECRET" "Description" "URL pour obtenir le token"
set_secret() {
  local name="$1"
  local description="$2"
  local url="${3:-}"

  echo -e "\n${BOLD}${name}${RESET}"
  echo -e "  ${description}"
  if [[ -n "$url" ]]; then
    echo -e "  ${YELLOW}→ Obtenir ici : ${url}${RESET}"
  fi

  # Vérifie si le secret existe déjà
  if gh secret list --repo "$REPO" 2>/dev/null | grep -q "^${name}"; then
    echo -e "  ${YELLOW}⚠ Ce secret existe déjà. Laisser vide pour garder la valeur actuelle.${RESET}"
  fi

  # Lecture sécurisée (pas d'écho)
  local value=""
  read -r -s -p "  Valeur (invisible) : " value
  echo ""

  if [[ -z "$value" ]]; then
    echo -e "  ${YELLOW}→ Ignoré (vide)${RESET}"
    return 0
  fi

  # Envoi direct à GitHub
  echo -n "$value" | gh secret set "$name" --repo "$REPO" --body -
  echo -e "  ${GREEN}✓ Secret ${name} configuré${RESET}"
  CONFIGURED_COUNT=$((CONFIGURED_COUNT + 1))
}

ask_skip() {
  local platform="$1"
  echo -e "\n${YELLOW}Avez-vous un compte ${platform} configuré ? (o/n)${RESET}"
  read -r -p "  → " answer
  [[ "$answer" =~ ^[oOyY]$ ]]
}

# =============================================================================
# DÉBUT DU SCRIPT
# =============================================================================

CONFIGURED_COUNT=0
SKIPPED_SECTIONS=()

echo -e "\n${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║     LMS Kernel — Configuration des secrets       ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
echo -e ""
echo -e "Ce script configure tous les secrets GitHub pour le repo :"
echo -e "${BOLD}${REPO}${RESET}"
echo -e ""
echo -e "${RED}IMPORTANT : Ne partagez JAMAIS ces valeurs dans un chat,${RESET}"
echo -e "${RED}un fichier, un email ou un écran partagé.${RESET}"

check_deps

# =============================================================================
# BLOC 1 — GitHub
# =============================================================================
section "1/9 — GitHub (Workflow Trigger Token)"

echo -e ""
echo -e "Créer un Personal Access Token GitHub avec les scopes :"
echo -e "  • ${BOLD}repo${RESET} (accès complet au repo)"
echo -e "  • ${BOLD}workflow${RESET} (pour déclencher des workflows)"
echo -e "${YELLOW}→ Obtenir ici : https://github.com/settings/tokens/new${RESET}"

set_secret "WORKFLOW_TRIGGER_TOKEN" \
  "Personal Access Token GitHub (scopes: repo + workflow)" \
  "https://github.com/settings/tokens/new"

# =============================================================================
# BLOC 2 — Bitwarden Secrets Manager
# =============================================================================
section "2/9 — Bitwarden Secrets Manager"

if ask_skip "Bitwarden Secrets Manager"; then
  echo -e "\n→ Aller dans Bitwarden SM → Machine Accounts → Générer un token"
  set_secret "BWS_ACCESS_TOKEN" \
    "Machine Account token Bitwarden Secrets Manager" \
    "https://vault.bitwarden.com/#/sm"
else
  echo -e "  ${YELLOW}→ Création compte : https://bitwarden.com/products/secrets-manager/${RESET}"
  SKIPPED_SECTIONS+=("Bitwarden SM")
fi

# =============================================================================
# BLOC 3 — Atlassian (Jira + Confluence)
# =============================================================================
section "3/9 — Atlassian : Jira + Confluence"

if ask_skip "Atlassian (Jira + Confluence)"; then
  echo -e "\n→ Générer API token : https://id.atlassian.com/manage-profile/security/api-tokens"
  echo -e "  Le même token est utilisé pour Jira ET Confluence."

  set_secret "ATLASSIAN_EMAIL" \
    "Votre email Atlassian (ex: vous@exemple.com)"

  set_secret "JIRA_API_TOKEN" \
    "API Token Atlassian (utilisé pour Jira + Confluence)" \
    "https://id.atlassian.com/manage-profile/security/api-tokens"

  set_secret "JIRA_BASE_URL" \
    "URL base Atlassian (ex: https://mon-org.atlassian.net)"

  set_secret "JIRA_PROJECT_KEY" \
    "Clé du projet Jira (ex: LMS)"

  set_secret "CONFLUENCE_BASE_URL" \
    "URL base Confluence (même domaine Atlassian)"

  set_secret "CONFLUENCE_SPACE_KEY" \
    "Clé de l'espace Confluence (ex: LMSK)"
else
  echo -e "  ${YELLOW}→ Créer compte : https://www.atlassian.com/software/jira${RESET}"
  SKIPPED_SECTIONS+=("Jira + Confluence")
fi

# =============================================================================
# BLOC 4 — Sentry
# =============================================================================
section "4/9 — Sentry (monitoring erreurs)"

if ask_skip "Sentry"; then
  echo -e "\n→ DSN : Sentry → Projet → Settings → Client Keys"
  echo -e "→ Auth Token : Sentry → Settings → Auth Tokens"

  set_secret "SENTRY_DSN_API" \
    "DSN du projet NestJS API dans Sentry" \
    "https://sentry.io/settings/"

  set_secret "SENTRY_DSN_WEB" \
    "DSN du projet Next.js Web dans Sentry"

  set_secret "SENTRY_AUTH_TOKEN" \
    "Auth Token Sentry (pour CI upload source maps)" \
    "https://sentry.io/settings/account/api/auth-tokens/"

  set_secret "SENTRY_ORG" \
    "Slug de votre organisation Sentry (ex: mon-org)"

  set_secret "SENTRY_PROJECT" \
    "Slug du projet Sentry API (ex: lms-kernel-api)"
else
  echo -e "  ${YELLOW}→ Créer compte : https://sentry.io${RESET}"
  SKIPPED_SECTIONS+=("Sentry")
fi

# =============================================================================
# BLOC 5 — SonarCloud
# =============================================================================
section "5/9 — SonarCloud (qualité du code)"

if ask_skip "SonarCloud"; then
  echo -e "\n→ Connexion via GitHub → Analyser Diofevre/lms-kernel"
  echo -e "→ Token : My Account → Security → Generate Token"

  set_secret "SONAR_TOKEN" \
    "Token SonarCloud" \
    "https://sonarcloud.io/account/security"
else
  echo -e "  ${YELLOW}→ Créer compte (gratuit repo public) : https://sonarcloud.io${RESET}"
  SKIPPED_SECTIONS+=("SonarCloud")
fi

# =============================================================================
# BLOC 6 — Codecov
# =============================================================================
section "6/9 — Codecov (couverture de tests)"

if ask_skip "Codecov"; then
  echo -e "\n→ Connexion via GitHub → Activer Diofevre/lms-kernel"

  set_secret "CODECOV_TOKEN" \
    "Token Codecov pour upload des rapports de couverture" \
    "https://app.codecov.io/gh/Diofevre/lms-kernel/settings"
else
  echo -e "  ${YELLOW}→ Créer compte (gratuit repo public) : https://codecov.io${RESET}"
  SKIPPED_SECTIONS+=("Codecov")
fi

# =============================================================================
# BLOC 7 — Snyk
# =============================================================================
section "7/9 — Snyk (audit dépendances)"

if ask_skip "Snyk"; then
  echo -e "\n→ Connexion via GitHub → Settings → General → Auth Token"

  set_secret "SNYK_TOKEN" \
    "Token Snyk pour audit des dépendances" \
    "https://app.snyk.io/account"
else
  echo -e "  ${YELLOW}→ Créer compte (gratuit open source) : https://snyk.io${RESET}"
  SKIPPED_SECTIONS+=("Snyk")
fi

# =============================================================================
# BLOC 8 — dbdocs.io
# =============================================================================
section "8/9 — dbdocs.io (schéma base de données)"

if ask_skip "dbdocs.io"; then
  echo -e "\n→ Connexion via GitHub → Settings → API Token"

  set_secret "DBDOCS_TOKEN" \
    "API Token dbdocs.io pour publier le schéma Prisma" \
    "https://dbdocs.io/settings"
else
  echo -e "  ${YELLOW}→ Créer compte : https://dbdocs.io${RESET}"
  SKIPPED_SECTIONS+=("dbdocs.io")
fi

# =============================================================================
# BLOC 9 — Slack
# =============================================================================
section "9/9 — Slack (notifications déploiement)"

if ask_skip "Slack (workspace avec canal #deployments)"; then
  echo -e "\n→ Apps → Incoming Webhooks → Add to Slack → Choisir #deployments"

  set_secret "SLACK_WEBHOOK_URL" \
    "URL du Incoming Webhook Slack pour le canal #deployments" \
    "https://api.slack.com/messaging/webhooks"
else
  echo -e "  ${YELLOW}→ Créer workspace : https://slack.com${RESET}"
  SKIPPED_SECTIONS+=("Slack")
fi

# =============================================================================
# RÉSUMÉ
# =============================================================================
echo -e "\n${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║                   RÉSUMÉ                        ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
echo -e ""
echo -e "${GREEN}✓ Secrets configurés : ${CONFIGURED_COUNT}${RESET}"

if [[ ${#SKIPPED_SECTIONS[@]} -gt 0 ]]; then
  echo -e "${YELLOW}⚠ Sections ignorées (compte à créer) :${RESET}"
  for s in "${SKIPPED_SECTIONS[@]}"; do
    echo -e "  • ${s}"
  done
  echo -e "\n  Relancer ce script après avoir créé les comptes manquants."
fi

echo -e ""
echo -e "${BOLD}Vérifier les secrets configurés :${RESET}"
echo -e "  gh secret list --repo ${REPO}"
echo -e ""
echo -e "${GREEN}✓ Terminé. Aucune valeur n'a été affichée ou sauvegardée.${RESET}"
