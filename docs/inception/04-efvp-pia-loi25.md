# ÉFVP / PIA — LMS Kernel
> Référence : PIA-2026-001
> Date : 2026-02-28
> Version : 1.0
> Cadre légal applicable : Loi 25 Québec (Loi modernisant des dispositions législatives en matière de protection des renseignements personnels, L.R.Q. c. P-39.1), LPRPDE (L.C. 2000, ch. 5)
> DPO / Responsable de la Protection des Renseignements Personnels : Sophie Larrivée, Directrice Conformité — Diofevre Inc.
> Auteure : Isabelle Chen, Lead Ingénieure Sécurité CISSP — Diofevre Inc.
> Révisé par : Alexandra Dupont (CTO), Maître Jean-François Beaulieu (Conseiller Juridique)

---

## Préambule

La présente Évaluation des Facteurs relatifs à la Vie Privée (ÉFVP) est réalisée conformément à l'article 3.3 de la Loi 25 (en vigueur depuis le 22 septembre 2023, phase 3), qui impose la réalisation d'une ÉFVP pour tout projet impliquant la collecte, l'utilisation, la communication ou la conservation de renseignements personnels à des fins nouvelles ou lors d'acquisition de système d'information. LMS Kernel constitue un tel système en raison de son traitement de renseignements personnels de personnes physiques identifiables (apprenants, instructeurs) pour le compte de multiples institutions clientes (tenants).

Diofevre Inc. agit en qualité de **responsable du traitement** pour les données d'exploitation de la plateforme, et de **sous-traitant mandataire** pour les données pédagogiques des tenants. Cette dualité est explicitée dans les Accords de Traitement des Données (ATD) conclus avec chaque tenant.

---

## 1. Description du Traitement

### 1.1 Finalités et Bases Légales

#### 1.1.1 Finalités du Traitement

| ID | Finalité | Description | Nécessaire à l'exécution du contrat |
|----|---------|-------------|-------------------------------------|
| F-01 | Authentification et gestion des accès | Vérification de l'identité des utilisateurs pour accéder à la plateforme | Oui |
| F-02 | Gestion de la progression pédagogique | Enregistrement de la complétion des modules, scores, temps passé | Oui |
| F-03 | Émission de certificats de formation | Génération et stockage des attestations de réussite | Oui |
| F-04 | Communication pédagogique | Notifications liées aux cours (rappels, évaluations, résultats) | Oui |
| F-05 | Audit et conformité | Traçabilité des actions pour obligations légales et sécurité | Oui (obligation légale) |
| F-06 | Facturation tenant | Traitement des données de facturation des institutions clientes | Oui |
| F-07 | Amélioration de la plateforme | Analyse agrégée et anonymisée des usages | Non — consentement distinct requis |
| F-08 | Support technique | Accès aux données par l'équipe support en cas d'incident | Oui (accès minimal) |

#### 1.1.2 Bases Légales (Loi 25 + LPRPDE)

Sous **Loi 25 (Québec)** — L.R.Q. c. P-39.1 :
- **Article 12** : Collecte limitée aux fins déterminées, légitimes et explicites. LMS Kernel collecte uniquement les renseignements nécessaires à la prestation du service de formation (finalités F-01 à F-06).
- **Article 12.1** (en vigueur depuis sept. 2023) : Politique de confidentialité publiée et accessible avant toute collecte.
- **Article 8** : Consentement manifeste, libre et éclairé requis pour F-07 (amélioration plateforme). Collecté via case à cocher explicite lors de l'inscription, dissociée des CGU.
- **Article 21** : Droit d'accès, rectification, déportabilité.
- **Article 3.3** : Présente ÉFVP obligatoire.

Sous **LPRPDE (fédéral)** — L.C. 2000, ch. 5, Annexe 1 (Principe 2) :
- Les renseignements collectés sont limités à ceux nécessaires aux fins identifiées.
- Le consentement (express ou implicite selon la sensibilité) est obtenu lors de la création du compte par le tenant.

**Note de compatibilité :** La Loi 25 est considérée substantiellement similaire à la LPRPDE par le Commissaire à la protection de la vie privée du Canada. LMS Kernel se conforme aux deux régimes, la Loi 25 étant plus stricte et primant en cas de conflit pour les données des résidents québécois.

---

### 1.2 Catégories de Données

#### 1.2.1 Données des Apprenants (Learners)

| Catégorie | Champs | Sensibilité | Collecte | Conservation |
|-----------|--------|-------------|---------|--------------|
| Identité | Prénom, nom, adresse courriel institutionnelle | Élevée (PII directe) | Inscription via SSO tenant | Durée compte actif + 24 mois |
| Progression | % complétion par module, temps passé, tentatives | Moyenne (PII indirecte) | Automatique lors de l'usage | Durée compte actif + 24 mois |
| Évaluations | Scores, réponses aux quiz, notes de soumissions | Élevée (données de performance) | Automatique lors des évaluations | Durée compte actif + 24 mois |
| Certificats | Attestations numériques (nom, date, formation, score) | Élevée | Émission automatique à la réussite | Permanente (valeur légale) |
| Logs d'audit | Actions horodatées, IP de connexion, user-agent | Élevée (données comportementales) | Automatique | 12 mois (après, anonymisation) |
| Préférences | Langue, accessibilité, notifications | Faible | Paramètres utilisateur | Durée compte actif |

#### 1.2.2 Données des Instructeurs

| Catégorie | Champs | Sensibilité | Collecte |
|-----------|--------|-------------|---------|
| Identité | Prénom, nom, adresse courriel professionnelle | Élevée (PII directe) | Création compte par TENANT_ADMIN |
| Contenus créés | Référence aux cours créés/modifiés (métadonnées) | Faible | Automatique lors de la création |
| Logs d'activité | Actions sur la plateforme (modifications cours, évaluations) | Moyenne | Automatique (audit log) |

#### 1.2.3 Données des Tenants (Institutions)

| Catégorie | Champs | Sensibilité | Collecte |
|-----------|--------|-------------|---------|
| Identification tenant | Nom institution, subdomain, logo, configuration SAML | Interne | Onboarding |
| Facturation | Contact facturation, coordonnées bancaires (tokenisées via Stripe) | Très Élevée | Contractuel |
| Configuration | Politiques de mot de passe, rôles personnalisés, intégrations SSO | Moyenne | Configuration admin |

#### 1.2.4 Données NON collectées

LMS Kernel ne collecte **pas** les données suivantes (confirmé par revue de l'architecture) :
- Données biométriques
- Données de santé
- Numéro d'assurance sociale (NAS)
- Données de géolocalisation précise (seule l'IP est collectée dans les logs d'audit)
- Données de mineurs de moins de 14 ans (sans consentement parental renforcé — voir section 1.3)

#### 1.2.5 Chiffrement des Données PII

Toutes les données classifiées PII (catégories identité, évaluations, certificats) sont chiffrées au repos via AES-256 géré par AWS KMS (clés spécifiques par tenant). Les données en transit sont protégées par TLS 1.3. Aucune donnée PII n'est stockée en texte clair dans les logs.

---

### 1.3 Personnes Concernées

| Catégorie | Nombre estimé (Phase 1 — 12 mois) | Vulnérabilité |
|-----------|-----------------------------------|--------------|
| Apprenants adultes (18+) | 45 000 personnes réparties sur 12 tenants | Faible vulnérabilité — adultes consentants |
| Apprenants mineurs (14–17 ans) | 3 000 personnes (tenants collège, formation professionnelle) | Vulnérabilité accrue — consentement parental requis |
| Apprenants mineurs (< 14 ans) | Non prévu en Phase 1 — bloqué techniquement | Non applicable |
| Instructeurs | 1 200 personnes | Faible vulnérabilité — professionnels adultes |
| Admins tenant | 120 personnes | Faible vulnérabilité |

**Note sur les mineurs (14–17 ans) :** Conformément à l'article 4.1 de la Loi 25 et à l'avis du CAI (Commission d'accès à l'information) du Québec, le consentement d'un parent ou tuteur légal est requis pour les mineurs de moins de 14 ans. Pour les 14–17 ans, le consentement de l'adolescent est valide pour des finalités pédagogiques normales, mais le tenant (institution) est responsable de l'obtention de ce consentement dans le cadre de son contrat d'inscription.

**Risque de vulnérabilité particulière :** Les données d'évaluations et de progression peuvent avoir un impact significatif sur la trajectoire académique et professionnelle des personnes concernées (admission, diplôme, emploi). Leur exactitude et leur sécurité revêtent donc une importance accrue.

---

### 1.4 Destinataires et Sous-Traitants

#### 1.4.1 Destinataires Internes Diofevre

| Rôle | Accès | Justification |
|------|-------|--------------|
| SUPER_ADMIN Diofevre | Accès technique à toutes les données (limité, journalisé) | Support critique, incidents de sécurité — accès Just-In-Time requis (C-29) |
| Équipe Support L2 | Accès limité aux logs d'audit du tenant concerné | Résolution d'incidents — accès sur demande tracée |
| Équipe Sécurité | Accès aux logs d'audit agrégés (anonymisés) | Détection de menaces |
| Finance Diofevre | Données de facturation tenant uniquement | Gestion des contrats |

#### 1.4.2 Sous-Traitants Tiers

| Sous-traitant | Service | Données Accédées | Localisation | Accord de Confidentialité | Loi 25 Compatible |
|---------------|---------|-----------------|--------------|--------------------------|------------------|
| Amazon Web Services Canada Inc. | Infrastructure cloud (EC2, RDS, ElastiCache, S3, KMS, Secrets Manager, CloudFront, ALB, ECS Fargate, CloudWatch) | Toutes les données (hébergeur) | AWS ca-central-1 (Montréal + Ottawa) | DPA AWS signé | Oui — ca-central-1 |
| Red Hat Inc. (Keycloak) | Gestion des identités et authentification | Identifiants de connexion, tokens (géré in-house) | Déployé sur AWS ca-central-1 (self-hosted) | N/A (open source auto-hébergé) | Oui |
| Stripe Inc. | Paiement et facturation | Données de facturation tenant (tokenisées) | USA | DPA Stripe + Clauses Contractuelles Types | Transfert encadré — voir sect. 7 |
| GitHub Inc. (Microsoft) | Gestion du code source et CI/CD | Code source uniquement (pas de données de production) | USA (GitHub cloud) | DPA GitHub | Hors périmètre PII production |
| Snyk Ltd. | Analyse de sécurité des dépendances (CI) | Code source uniquement | UK / Cloud | DPA Snyk | Hors périmètre PII production |
| SonarCloud (Sonarsource) | SAST analyse de code | Code source uniquement | UE | DPA SonarSource | Hors périmètre PII production |

**Note critique :** AWS est le seul sous-traitant ayant accès aux données de production des personnes concernées. Le contrat AWS (AWS Data Processing Addendum) a été signé et AWS s'engage à traiter les données uniquement dans la région ca-central-1 telle que configurée. Les VPC Endpoints S3 et les politiques de région AWS Organization sont en place pour empêcher tout transfert hors ca-central-1.

---

### 1.5 Flux de Données (Diagramme Texte)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  COLLECTE (Point d'entrée)                                                    ║
║                                                                               ║
║  [Apprenant / Instructeur]                                                    ║
║       │                                                                       ║
║       │ 1. Authentification SSO (OIDC/SAML via institution)                  ║
║       │    → Keycloak 24 (AWS ca-central-1)                                  ║
║       │    → Données : email, nom, rôle                                      ║
║       │                                                                       ║
║       │ 2. Requêtes API (navigation, progression, évaluations)               ║
║       ↓    → NestJS API (AWS ca-central-1)                                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  TRAITEMENT (Zone App — AWS ca-central-1 UNIQUEMENT)                         ║
║                                                                               ║
║  NestJS API                                                                   ║
║  ├── AuditInterceptor → audit_logs (PostgreSQL)  [chiffré AES-256]           ║
║  ├── ProgressionService → user_progress (PostgreSQL) [chiffré AES-256]       ║
║  ├── CertificateService → certificates (PostgreSQL + S3)                     ║
║  ├── CacheService → Redis 7 (données temporaires, TTL 1h max)                ║
║  └── SecretsService → AWS Secrets Manager (credentials uniquement)           ║
║                                                                               ║
║  PostgreSQL 16 (RDS Multi-AZ — ca-central-1)                                 ║
║  ├── tenant_users (PII chiffrés, RLS par tenant)                             ║
║  ├── audit_logs (SHA-256 chain, immuable, 12 mois rétention)                 ║
║  ├── user_progress (progression, évaluations)                                ║
║  └── certificates (attestations)                                             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  ACCÈS AUTORISÉS (Internes)                                                   ║
║                                                                               ║
║  [TENANT_ADMIN] → Données de ses propres apprenants uniquement (RLS)         ║
║  [AUDITOR] → Audit logs de son tenant (lecture seule)                        ║
║  [SUPER_ADMIN Diofevre] → Accès technique total (journalisé, JIT)           ║
║  [Support L2 Diofevre] → Logs d'audit du tenant concerné (sur demande)      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  TRANSFERTS (Voir Section 7)                                                  ║
║                                                                               ║
║  Stripe (USA) ←→ Diofevre Finance : données facturation tenant UNIQUEMENT    ║
║                  (pas de PII apprenants/instructeurs)                         ║
║                                                                               ║
║  GitHub/Snyk/SonarCloud : code source UNIQUEMENT (hors données production)   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  DESTRUCTION (Voir Section 6)                                                 ║
║                                                                               ║
║  Soft delete (deletedAt) → Anonymisation → Purge physique                    ║
║  Audit logs : 12 mois → Anonymisation des champs PII → Conservation légale  ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Évaluation de la Nécessité et Proportionnalité

### 2.1 Test de Nécessité

Pour chaque catégorie de données, Diofevre a évalué si la collecte est strictement nécessaire à la finalité déclarée :

| Donnée | Finalité associée | Nécessaire ? | Alternatives moins intrusives évaluées |
|--------|------------------|-------------|----------------------------------------|
| Prénom + Nom | Personnalisation, certificats | Oui | Pseudonyme envisagé, rejeté (valeur légale certificat) |
| Adresse courriel | Authentification, notifications | Oui | Identifiant opaque envisagé, rejeté (notifications essentielles) |
| Scores d'évaluations | Certification, progression | Oui | Score agrégé seul insuffisant pour suivi pédagogique |
| IP de connexion (logs audit) | Sécurité, détection fraude | Oui (réduit — seul octet masqué envisagé) | Anonymisation partielle (masquage dernier octet) à implémenter |
| User-agent (logs audit) | Sécurité, support | Oui | Collecte réduite à type de navigateur seulement |
| Temps passé par module | Analyse pédagogique tenant | Oui | Agrégé quotidien suffisant (granularité réduite envisagée) |
| Réponses détaillées aux quiz | Pédagogie, feedback | Oui — si activé par tenant | Paramétrable par tenant (opt-in) |

### 2.2 Test de Proportionnalité

- **Durée :** Les données sont conservées pendant la durée active du compte + 24 mois. Cette durée est justifiée par les obligations de certification et de preuve pédagogique, mais sera réexaminée lors de la prochaine ÉFVP (révision annuelle obligatoire Loi 25).
- **Périmètre :** Les données ne sont accessibles qu'aux personnes concernées, à leur tenant (institution), et à Diofevre en cas de nécessité technique documentée. Aucune communication à des tiers non listés en 1.4 n'est autorisée.
- **Agrégation :** Pour la finalité F-07 (amélioration plateforme), seules des données agrégées et dé-identifiées (k-anonymat ≥ 10) sont utilisées, après consentement distinct.

### 2.3 Principe de Minimisation (Art. 5 Loi 25)

Un audit de minimisation a été conduit le 2026-01-15 par l'équipe Engineering + DPO. Résultats :
- **4 champs supprimés** du schéma initial : numéro de téléphone (inutile pour LMS), date de naissance (inutile — vérification âge déléguée au tenant), ville de résidence, photo de profil (non requise pour la formation).
- **3 champs rendus optionnels** : pronoms (opt-in), organisation interne (libre saisie), biographie instructeur (opt-in).

---

## 3. Évaluation des Risques pour les Droits des Personnes

### 3.1 Tableau des Risques

| ID | Risque | Probabilité (1–5) | Impact (1–5) | Score (P×I) | Mesures en Place | Risque Résiduel |
|----|--------|-------------------|--------------|-------------|-----------------|----------------|
| R-01 | Fuite de données apprenants (cross-tenant) | 2 | 5 | **10** | RLS PostgreSQL, TLS 1.3, chiffrement AES-256 | Moyen (lacune pooling — TH-10) |
| R-02 | Utilisation des données à des fins non déclarées | 1 | 5 | **5** | Finalités documentées, contrats tenant, audit log | Faible |
| R-03 | Accès non autorisé aux évaluations (IDOR) | 3 | 4 | **12** | RLS, AuthGuard, rôles RBAC | Moyen-Élevé (TH-06) |
| R-04 | Discrimination basée sur données de performance | 1 | 5 | **5** | Données accessibles uniquement au tenant et à l'apprenant | Faible |
| R-05 | Violation de données (breach externe) | 2 | 5 | **10** | WAF, TLS, chiffrement, Snyk, DAST | Moyen |
| R-06 | Perte d'intégrité des logs d'audit (altération) | 1 | 4 | **4** | Hash chain SHA-256, permissions applicatives | Faible (amélioration possible) |
| R-07 | Conservation excessive des données | 2 | 3 | **6** | Politique de rétention documentée (sect. 6), soft delete | Faible-Moyen |
| R-08 | Impossibilité d'exercer ses droits (accès, effacement) | 2 | 4 | **8** | API droits des personnes (sect. 5) | Moyen (processus à formaliser) |
| R-09 | Transfert de données hors Canada sans encadrement | 1 | 5 | **5** | AWS ca-central-1 uniquement, politique de région | Faible (Stripe encadré) |
| R-10 | Compromission des credentials Keycloak | 2 | 5 | **10** | OIDC, MFA (à déployer), ThrottlerGuard | Moyen (MFA non obligatoire — TH-04) |
| R-11 | Profilage non consenti des apprenants | 1 | 4 | **4** | F-07 requiert consentement distinct, dé-identification | Faible |
| R-12 | Atteinte à la réputation d'un apprenant (fuite de notes) | 2 | 5 | **10** | Chiffrement, RLS, accès limité | Moyen |

**Seuils d'acceptabilité :**
- Score ≤ 4 : Risque acceptable — surveillance continue
- Score 5–8 : Risque toléré — mesures de mitigation planifiées
- Score ≥ 9 : Risque inacceptable — action corrective obligatoire avant mise en production

**Risques nécessitant une action corrective (score ≥ 9) :** R-01, R-03, R-05, R-10, R-12

---

## 4. Mesures de Sécurité (Techniques et Organisationnelles)

### 4.1 Mesures Techniques

| Mesure | Description | Statut | Référence |
|--------|-------------|--------|-----------|
| Chiffrement transit | TLS 1.3 obligatoire sur tous les flux externes et internes | Implémenté | C-01 |
| Chiffrement repos | AES-256 via AWS KMS pour données PII PostgreSQL + S3 | Implémenté | C-09 |
| Authentification forte | Keycloak 24 OIDC/SAML, JWT RS256, expiration 15min | Implémenté | C-02, C-03 |
| MFA administrateurs | MFA obligatoire pour SUPER_ADMIN et TENANT_ADMIN | À déployer (30j) | C-20 |
| Isolation multi-tenant | RLS PostgreSQL + subdomain routing + validation DB | Partiellement (lacune pooling) | C-04, C-18 |
| Minimisation logs | Masquage PII dans logs applicatifs CloudWatch | À implémenter (30j) | C-25 |
| Détection d'intrusion | OWASP ZAP DAST nightly + SonarCloud SAST | Implémenté | C-13, C-14 |
| Gestion des secrets | AWS Secrets Manager (prod), rotation automatique | Implémenté | C-08 |
| Audit trail immuable | Hash chain SHA-256, permissions write-only applicatif | Implémenté (amélioration à faire) | C-07 |
| WAF | CloudFront + AWS WAF Managed Rules (OWASP Top 10) | Implémenté | Architecture |
| Scan dépendances | Snyk intégré CI, alertes CVE critiques | Implémenté | C-12 |
| Sauvegarde chiffrée | RDS Automated Backups (AES-256, 35 jours, ca-central-1) | Implémenté | Infrastructure |

### 4.2 Mesures Organisationnelles

| Mesure | Description | Responsable | Statut |
|--------|-------------|-------------|--------|
| DPO désigné | Sophie Larrivée, Directrice Conformité — poste dédié | DPO | Implémenté |
| Registre des activités de traitement | Document RAT-2026-001 tenu à jour par le DPO | DPO (Sophie Larrivée) | Implémenté |
| Accords de traitement de données | ATD signés avec chaque tenant avant activation | Juridique + Sales | Implémenté |
| Formation du personnel | Formation annuelle Loi 25 / sécurité pour tout le personnel Diofevre | DPO + RH | Dernière session : 2026-01-10 |
| Principe du moindre privilège | Accès aux données limité au strict nécessaire par rôle | Lead Sec + Ops | Implémenté |
| Politique de télétravail sécurisé | VPN obligatoire, MDM sur postes, chiffrement disque | IT / Ops | Implémenté |
| Politique de violation de données | Procédure de notification 72h (CAI + personnes concernées) | DPO | Implémenté — voir sect. 4.3 |
| Revue trimestrielle des accès | Révocation des accès inutiles (ex-employés, rôles changés) | IT + DPO | Fréquence : trimestrielle |
| NDAs fournisseurs | Accords de confidentialité signés avec tout prestataire ayant accès aux données | Juridique | Implémenté |
| Évaluation des sous-traitants | Due diligence sécurité annuelle des sous-traitants tiers | DPO + Lead Sec | Annuelle |

### 4.3 Procédure de Notification de Violation (Art. 3.5 Loi 25)

En cas de violation de données présentant un risque sérieux de préjudice :

**Délai légal : 72 heures** (article 3.5 Loi 25, en vigueur sept. 2023)

```
HEURE 0 : Détection de l'incident
  ↓
HEURE 0–4 : Évaluation préliminaire par l'équipe Sécurité (Isabelle Chen)
  → Périmètre, données affectées, nb de personnes, type de risque
  ↓
HEURE 4–8 : Escalade au DPO (Sophie Larrivée) + CTO (Alexandra Dupont)
  → Décision de notification obligatoire (seuil : risque sérieux de préjudice)
  ↓
HEURE 8–48 : Investigation technique approfondie
  → Confinement, analyse forensique, logs d'audit
  ↓
HEURE 48–72 : Notification obligatoire à la CAI (Commission d'accès à l'information)
  → Formulaire CAI en ligne : https://www.cai.gouv.qc.ca/
  → Rapport incident contenant : nature violation, données affectées,
    nb personnes, mesures prises, mesures correctives
  ↓
HEURE 48–72 : Notification aux tenants concernés
  → Contact TENANT_ADMIN avec rapport détaillé
  ↓
SELON ÉVALUATION : Notification aux personnes concernées
  → Si risque sérieux de préjudice direct (vol d'identité, discrimination,
    atteinte réputation), notification directe à chaque personne affectée
  → Délai : le plus tôt possible, sans délai déraisonnable
  ↓
POST-72H : Documentation dans le registre des incidents (Loi 25 art. 3.5)
```

**Interlocuteurs CAI :**
- Commission d'accès à l'information du Québec
- 575, rue Saint-Amable, Bureau 1.10, Québec (QC) G1R 2G4
- Signalement en ligne : formulaire électronique CAI (obligatoire depuis sept. 2023)

---

## 5. Droits des Personnes

### 5.1 Droit d'Accès (Art. 27 Loi 25 + LPRPDE Principe 9)

**Description :** Toute personne concernée peut demander l'accès à ses renseignements personnels détenus par Diofevre (via LMS Kernel) dans les **30 jours** suivant la réception de la demande.

**Mécanisme d'exercice :**
- Portail en ligne accessible depuis le profil utilisateur (endpoint `GET /api/v1/privacy/my-data`)
- Formulaire de demande papier envoyé à : dpo@diofevre.ca
- Authentification obligatoire avant toute divulgation (vérification identité)

**Format de réponse :** Export JSON ou PDF lisible incluant toutes les données PII, la progression, les évaluations, les certificats et le résumé des logs d'audit de l'utilisateur.

**Délai de réponse :** 30 jours calendaires. En cas de besoin d'extension (volume ou complexité), le DPO notifie la personne dans les 30 jours avec le délai estimé (max 60 jours supplémentaires).

---

### 5.2 Droit de Rectification (Art. 28 Loi 25)

**Description :** La personne peut demander la correction de renseignements inexacts ou incomplets.

**Mécanisme :** Interface self-service pour les champs modifiables (nom affiché, email, préférences). Pour les données verrouillées (évaluations, certificats), la demande est traitée manuellement par le TENANT_ADMIN avec validation pédagogique, sous 30 jours.

**Note :** Les corrections apportées aux données PII génèrent automatiquement une entrée dans les audit logs, garantissant la traçabilité.

---

### 5.3 Droit à l'Effacement (Art. 28.1 Loi 25 + Droit à l'oubli)

**Description :** Droit de demander l'effacement des renseignements personnels lorsque la finalité du traitement est accomplie ou le consentement retiré.

**Implémentation technique :**

```typescript
// Soft delete obligatoire (champ deletedAt)
// Pas de hard delete immédiat — Loi 25 impose conservation minimale
await prisma.user.update({
  where: { id: userId, tenantId: ctx.tenantId },
  data: {
    deletedAt: new Date(),
    email: `deleted-${crypto.randomUUID()}@deleted.lms-kernel.ca`, // pseudonymisation
    firstName: '[Supprimé]',
    lastName: '[Supprimé]',
  }
});
```

**Délai d'exécution :**
1. Soft delete immédiat (pseudonymisation) : dans les 72 heures
2. Purge physique des données brutes PII : selon calendrier de rétention (sect. 6)
3. Les certificats émis sont conservés (valeur légale — données dépersonnalisées du point de vue de l'accès tiers)
4. Les audit logs sont conservés 12 mois puis anonymisés (les données PII sont remplacées par un identifiant opaque)

**Limites légales à l'effacement :**
- Conservation requise pour preuve de certification (valeur légale employeur)
- Conservation pour obligations légales comptables (données facturation tenant — 7 ans)
- Conservation des audit logs pour sécurité et détection d'intrusion (12 mois)

---

### 5.4 Droit à la Portabilité / Déportabilité (Art. 27 Loi 25 — Spécifique Québec)

**Description :** La Loi 25 (art. 27) introduit un droit à la portabilité renforcé incluant la transmission directe des données **à un tiers désigné par la personne** dans un format structuré, couramment utilisé et lisible par machine. Ce droit s'applique depuis le 22 septembre 2023.

**Données portables :** Données PII directes (identité), progression pédagogique, scores d'évaluations, certificats.

**Données non portables :** Logs d'audit (données de sécurité), données dérivées/agrégées.

**Mécanisme d'exercice :**
- Endpoint API dédié : `POST /api/v1/privacy/export-portable`
- Format de sortie : JSON (structure normalisée) + PDF (certificats)
- Destination : email sécurisé de la personne ou URL HTTPS d'un destinataire tiers autorisé (validée par la personne)
- Délai : 30 jours
- Authentification MFA requise pour les demandes de portabilité

**Exemple de payload portable (JSON) :**
```json
{
  "schemaVersion": "lms-kernel-portability-v1",
  "exportDate": "2026-02-28T00:00:00Z",
  "person": {
    "firstName": "Marie",
    "lastName": "Gagnon",
    "email": "marie.gagnon@etudiant.ulaval.ca"
  },
  "completedCourses": [
    {
      "courseTitle": "Gestion de projet Agile",
      "completionDate": "2026-01-15",
      "score": 87.5,
      "certificateId": "CERT-2026-UL-00847"
    }
  ],
  "progressionSummary": { ... }
}
```

---

### 5.5 Droit d'Opposition (Art. 27.1 Loi 25)

**Description :** La personne peut s'opposer à l'utilisation de ses renseignements à des fins d'amélioration de la plateforme (finalité F-07) à tout moment, sans justification.

**Mécanisme :** Toggle dans les paramètres de confidentialité du profil. L'opposition est effective immédiatement et appliquée à tous les systèmes dans les 24 heures. Les données déjà agrégées et anonymisées ne peuvent pas être rétractées.

---

### 5.6 Contact et Délégué à la Protection des Données (DPO)

Conformément à l'article 3.1 de la Loi 25 (obligations du responsable du traitement), Diofevre Inc. a désigné un DPO :

- **Nom :** Sophie Larrivée
- **Titre :** Directrice Conformité et Protection des Données
- **Organisation :** Diofevre Inc.
- **Courriel :** dpo@diofevre.ca
- **Téléphone :** +1 (514) 555-0180
- **Adresse :** 1000, rue De La Gauchetière Ouest, Bureau 2500, Montréal (QC) H3B 4W5

La désignation du DPO est publiée sur le site public de Diofevre Inc. et communiquée à la Commission d'accès à l'information du Québec (CAI) conformément à l'article 3.1 de la Loi 25.

---

## 6. Conservation et Destruction des Données

### 6.1 Calendrier de Rétention

| Catégorie de Données | Durée de Conservation Active | Événement Déclencheur | Action à l'Échéance |
|---------------------|-----------------------------|-----------------------|---------------------|
| PII Learners (identité) | Durée compte actif + 24 mois | Fermeture compte ou fin contrat tenant | Soft delete → pseudonymisation → purge physique à M+24 |
| Progression pédagogique | Durée compte actif + 24 mois | Idem | Anonymisation agrégée conservée, données individuelles supprimées |
| Évaluations et scores | Durée compte actif + 36 mois | Idem | Purge physique à M+36 (valeur légale justifiant délai plus long) |
| Certificats émis | Permanente (avec dépersonnalisation sur demande) | Demande de la personne | Dépersonnalisation possible (nom remplacé par ID opaque) sur demande |
| Audit logs (sécurité) | 12 mois | Date de l'événement | Anonymisation des champs PII à M+12 (userId → hash opaque) |
| Logs applicatifs (CloudWatch) | 30 jours | Date du log | Purge automatique (politique rétention CloudWatch) |
| Données facturation tenant | 7 ans | Date de facturation | Archivage froid (S3 Glacier, chiffré, ca-central-1) |
| Configuration tenant | Durée contrat + 12 mois | Fin contrat tenant | Purge complète à M+12 |
| Backup RDS | 35 jours glissants | Date du backup | Purge automatique (politique RDS Automated Backup) |

### 6.2 Mécanisme de Suppression

**Soft Delete obligatoire (Loi 25 + audit) :**

Toute suppression dans LMS Kernel passe par le champ `deletedAt` (timestamp). Le hard delete physique n'est jamais exécuté directement — il est géré par un job d'expiration planifié (cron AWS Lambda) qui vérifie les seuils de rétention.

```sql
-- Schéma PostgreSQL — Tous les modèles sensibles incluent :
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN deletion_reason VARCHAR(255) NULL;

-- Index partiel pour exclure les enregistrements supprimés des requêtes normales
CREATE INDEX idx_users_active ON users(tenant_id, id) WHERE deleted_at IS NULL;

-- Job de purge physique (Lambda cron — mensuel)
DELETE FROM users
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '24 months'
  AND tenant_id = $1; -- Paramétrisé par tenant, exécuté avec RLS actif
```

**Purge des données de progression et évaluations :**
- Les données agrégées anonymisées (score moyen par cours, taux de complétion) sont conservées au-delà de la rétention individuelle pour les statistiques pédagogiques anonymes du tenant.
- Seuil de k-anonymat : minimum 10 personnes par agrégat.

**Traçabilité des suppressions :**
- Toute opération de purge est enregistrée dans un audit log spécifique (`data_deletion_audit`) avec : tenant_id, type de données, plage temporelle, nombre d'enregistrements supprimés, exécuteur (Lambda ARN).

---

## 7. Transferts Hors Québec / Canada

### 7.1 Principe Général

Conformément à l'article 17 de la Loi 25, tout transfert de renseignements personnels hors du Québec nécessite une évaluation préalable du niveau de protection offert dans le territoire de destination, et la conclusion d'un accord de protection.

**Politique LMS Kernel :** Les données de production (PII apprenants, instructeurs, logs) sont **strictement stockées et traitées dans AWS ca-central-1** (Canada — Centre, localisé à Montréal et Ottawa). Aucun transfert de données de production hors du Canada n'est autorisé sans ÉFVP additionnelle et approbation du DPO.

### 7.2 Transferts Identifiés et Encadrés

| Destinataire | Pays | Données Transférées | Encadrement Légal | Niveau de Protection Évalué |
|-------------|------|--------------------|--------------------|----------------------------|
| **Stripe Inc.** | USA | Données de facturation des tenants (contact facturation, montants) — **AUCUNE donnée PII apprenants** | Clauses Contractuelles Types (CCT) Canada-USA + Stripe DPA + évaluation TIA (Transfer Impact Assessment) | Adéquat avec mesures supplémentaires |
| **GitHub Inc. (Microsoft)** | USA | Code source uniquement (aucune donnée PII de production) | GitHub DPA + Microsoft Online Services Terms | Non applicable (hors périmètre PII) |
| **Snyk Ltd.** | UK | Code source uniquement (aucune donnée PII de production) | Snyk DPA | Non applicable (hors périmètre PII) |
| **SonarCloud** | UE (Allemagne) | Code source uniquement | SonarSource DPA | Non applicable (hors périmètre PII) |

### 7.3 Mesures Techniques Prévenant les Transferts Non Autorisés

1. **AWS Organization Policy — Region Restriction :**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Sid": "DenyAllOutsideCentralCanada",
       "Effect": "Deny",
       "Action": "*",
       "Resource": "*",
       "Condition": {
         "StringNotEquals": {
           "aws:RequestedRegion": "ca-central-1"
         }
       }
     }]
   }
   ```

2. **S3 VPC Endpoint :** Tout accès S3 passe par un VPC Endpoint de type Gateway, empêchant le trafic S3 de traverser Internet.

3. **RDS Multi-AZ dans ca-central-1 :** Les réplicas de disponibilité (standby) sont dans la même région (ca-central-1 dispose de deux zones de disponibilité distinctes).

4. **Audit AWS CloudTrail :** Journalisation de toutes les API calls AWS, rétention 12 mois, stockée dans un bucket S3 dédié (ca-central-1) avec Object Lock (immuable).

### 7.4 Évaluation TIA pour Stripe

L'évaluation d'impact du transfert (TIA) vers Stripe (USA) conclut que :
- Les données transférées ne contiennent aucune PII d'apprenants ou d'instructeurs.
- Les données de facturation (contact tenant) présentent un risque modéré.
- Les mesures de protection Stripe (SOC 2 Type II, PCI DSS Level 1, chiffrement TLS/AES-256) sont jugées adéquates.
- Le DPA Stripe inclut des clauses de notification de violation dans les 72 heures.
- **Conclusion TIA :** Transfert autorisé avec mesures contractuelles en place. Révision annuelle.

---

## 8. Plan d'Action et Résidus de Risques Acceptés

### 8.1 Plan d'Action Prioritaire ÉFVP

| ID Action | Description | Risque(s) Adressé(s) | Responsable | Délai | Critère de Succès |
|-----------|-------------|---------------------|-------------|-------|------------------|
| PA-01 | Déployer MFA obligatoire SUPER_ADMIN + TENANT_ADMIN | R-10 (score 10) | Ops / Keycloak (Marc Tremblay) | 2026-03-29 | 100% comptes admin avec MFA actif |
| PA-02 | Corriger RLS + connection pooling (SET LOCAL) | R-01, R-03 (score 10, 12) | Backend Lead (Priya Nair) | 2026-03-21 | Tests cross-tenant passent en CI |
| PA-03 | Implémenter vérification applicative appartenance tenant | R-03 (score 12) | Équipe Backend | 2026-04-14 | Revue de code + tests IDOR passent |
| PA-04 | Déployer token blocklist Redis (révocation JWT) | R-10 (score 10) | Backend Lead (Priya Nair) | 2026-03-29 | Logout invalide token immédiatement |
| PA-05 | Masquage PII dans logs CloudWatch | R-01, R-12 (score 10) | Backend (Priya Nair) | 2026-03-29 | Scan CloudWatch : 0 PII en clair |
| PA-06 | Formaliser processus de demande droits des personnes | R-08 (score 8) | DPO (Sophie Larrivée) + Backend | 2026-04-28 | Procédure documentée + endpoint API opérationnel |
| PA-07 | Implémenter endpoint portabilité des données | R-08 (score 8) | Backend Lead | 2026-04-28 | Export JSON/PDF fonctionnel |
| PA-08 | Configurer politique rétention CloudWatch (30j) | R-07 (score 6) | DevOps (Marc Tremblay) | 2026-03-14 | Rétention configurée via IaC |
| PA-09 | Mettre en place job cron de purge physique | R-07 (score 6) | Backend + DevOps | 2026-04-14 | Lambda déployé + premier run validé |
| PA-10 | Révision et mise à jour des ATDs tenant | R-02 (score 5) | DPO + Juridique | 2026-04-28 | 100% tenants avec ATD Loi 25 conforme |

### 8.2 Résidus de Risques Acceptés

| ID Risque | Description | Score Résiduel Estimé (post-mesures) | Justification d'Acceptation | Approbateur |
|-----------|-------------|--------------------------------------|-----------------------------|-------------|
| R-04 | Discrimination basée sur données de performance | 3 | Risque inhérent à toute plateforme d'évaluation ; hors périmètre technique LMS Kernel (usage des données par l'institution) | DPO + CTO |
| R-11 | Profilage non consenti (F-07) | 2 | Consentement distinct requis + dé-identification k≥10 ; risque résiduel minimal | DPO |
| R-06 | Altération audit logs (attaquant avec accès DB) | 3 | Hash chain SHA-256 + permissions applicatives ; accès DB direct nécessite compromission AWS | Lead Sec + CTO |
| R-09 | Transfert données hors Canada (Stripe) | 2 | Limité aux données de facturation tenant (non-PII apprenants) + DPA + CCT en place | DPO + Juridique |

**Note :** Les risques résiduels acceptés font l'objet d'une surveillance continue et seront réévalués lors de la prochaine ÉFVP (prévue 2027-02-28).

---

## 9. Validation et Approbation

### 9.1 Registre des Activités de Traitement (RAT)

Conformément à l'article 3.2 de la Loi 25, le présent document s'intègre au Registre des Activités de Traitement (RAT) de Diofevre Inc. :

- **Référence RAT :** RAT-2026-007 — LMS Kernel (plateforme SaaS éducative)
- **Date d'entrée :** 2026-02-28
- **Prochaine révision :** 2027-02-28 (révision annuelle obligatoire)
- **Conservé par :** DPO (Sophie Larrivée)

### 9.2 Consultations Réalisées

| Partie Consultée | Date | Objet | Résultat |
|-----------------|------|-------|---------|
| Équipe Juridique (Me Jean-François Beaulieu) | 2026-02-10 | Conformité Loi 25 — bases légales et droits | Validation bases légales ; recommandation CCT Stripe |
| Équipe Engineering | 2026-02-15 | Revue technique mesures sécurité | Confirmation contrôles ; identification lacunes RLS pooling |
| Représentants tenants (2 universités, 1 collège) | 2026-02-20 | Consultation parties prenantes | Accord sur délais de rétention ; demande de portabilité renforcée |
| Commission d'accès à l'information (CAI) | Non requis (ÉFVP interne Phase 1) | Consultation préventive facultative | Prévu si score risque agrégé demeure ≥ 15 post-mitigation |

### 9.3 Approbations

| Rôle | Nom | Signature | Date | Portée |
|------|-----|-----------|------|--------|
| DPO / Responsable Protection Renseignements Personnels | Sophie Larrivée | *Sophie Larrivée* | 2026-02-28 | Conformité Loi 25 + LPRPDE |
| Lead Ingénieure Sécurité CISSP (Auteure) | Isabelle Chen | *Isabelle Chen* | 2026-02-28 | Mesures techniques |
| CTO | Alexandra Dupont | *Alexandra Dupont* | 2026-02-28 | Approbation direction |
| Conseiller Juridique | Me Jean-François Beaulieu | *J.-F. Beaulieu* | 2026-02-28 | Conformité légale |

### 9.4 Décision d'Approbation

**Décision : APPROUVÉ AVEC CONDITIONS**

La plateforme LMS Kernel est autorisée à traiter les renseignements personnels décrits dans la présente ÉFVP, sous réserve de la mise en œuvre des actions prioritaires PA-01, PA-02 et PA-03 dans les délais stipulés (au plus tard le 2026-04-14).

Un rapport d'avancement sur les 10 actions du plan (sect. 8.1) sera soumis au DPO et à la CTO le 2026-04-30.

La présente ÉFVP sera révisée intégralement au plus tard le 2027-02-28, ou avant en cas de :
- Modification substantielle des finalités de traitement
- Nouveau module impliquant une nouvelle catégorie de données sensibles
- Incident de sécurité significatif (breach notifié à la CAI)
- Modification de la Loi 25 ou directive de la CAI

---

*Document produit par Isabelle Chen, Lead Ingénieure Sécurité CISSP — Diofevre Inc. — 2026-02-28*
*Classification : CONFIDENTIEL — Usage interne Diofevre et tenants sous NDA*
*Ne pas distribuer sans autorisation du DPO (dpo@diofevre.ca)*