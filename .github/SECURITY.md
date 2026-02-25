# Security Policy

## Reporting a Vulnerability

**DO NOT** open a public GitHub issue for security vulnerabilities.

Contact: security@[your-domain].com
PGP Key: [add PGP key fingerprint here]

We will acknowledge within **24 hours** and provide a fix timeline within **72 hours** (as required by Loi 25 breach notification obligations).

## Supported Versions

| Version | Supported |
|---------|-----------|
| main    | ✅ |
| staging | ✅ |
| develop | ⚠️ (dev only) |

## Security Standards

This project adheres to:
- **Loi 25** (Québec) — Protection des renseignements personnels
- **LPRPDE** — Federal Canadian privacy law
- **WCAG 2.1 AA** — Accessibility standard
- **OWASP Top 10** — Web application security
- **CIS Benchmarks** — Container and infrastructure hardening

## Secrets Management

All secrets are managed via **Bitwarden Secrets Manager** (development) and **AWS Secrets Manager ca-central-1** (production).

**NEVER** commit secrets to this repository. Gitleaks runs on every commit and PR.

## Data Residency

All personal data (PII) of Quebec/Canadian residents must remain in **Canada (ca-central-1)**.
Violation of this policy is a Loi 25 breach and must be reported immediately.
