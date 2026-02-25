/**
 * @lms/compliance — Loi 25 (Québec) compliance types
 *
 * Loi modernisant des dispositions législatives en matière de
 * protection des renseignements personnels — Bill 64
 * In force: September 2022 (phase 1), September 2023 (phase 2), September 2024 (phase 3)
 */

/** Personal information categories per Loi 25 */
export type PIICategory =
  | "identity"       // Name, DOB, government ID
  | "contact"        // Email, phone, address
  | "financial"      // Payment info, income
  | "health"         // Medical records, disabilities
  | "biometric"      // Fingerprints, facial recognition (télésurveillance)
  | "behavioral"     // Browsing, usage patterns
  | "academic"       // Grades, transcripts, certificates
  | "employment"     // HR data, performance
  | "location";      // IP address, GPS

/** Consent record — must be stored for every PII collection */
export interface ConsentRecord {
  id: string;
  userId: string;
  tenantId: string;
  /** Which categories of PII were consented to */
  categories: PIICategory[];
  /** Explicit purpose — must be specific, not vague */
  purpose: string;
  /** ISO 8601 */
  givenAt: string;
  /** ISO 8601 — consent must be re-requested after this date */
  expiresAt?: string;
  /** How consent was given */
  method: "explicit_checkbox" | "signed_form" | "verbal_recorded";
  /** IP hash of the user at consent time */
  ipHash: string;
  withdrawnAt?: string;
}

/** Data subject request (Loi 25 Art. 27-28) */
export interface DataSubjectRequest {
  id: string;
  type: "access" | "correction" | "deletion" | "portability";
  userId: string;
  tenantId: string;
  requestedAt: string;
  /** Must be completed within 30 days per Loi 25 */
  deadline: string;
  status: "pending" | "in_progress" | "completed" | "denied";
  completedAt?: string;
  denialReason?: string;
}

/** Privacy Impact Assessment (ÉFVP) — required for new PII collections */
export interface PrivacyImpactAssessment {
  id: string;
  moduleId: string;
  title: string;
  newDataCategories: PIICategory[];
  purpose: string;
  retentionPeriodDays: number;
  thirdPartySharing: boolean;
  thirdParties?: string[];
  riskLevel: "low" | "medium" | "high";
  mitigations: string[];
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

/** Data retention policy — must be declared per entity with PII */
export interface RetentionPolicy {
  entityName: string;
  /** Number of days to retain — after this, auto-delete */
  retentionDays: number;
  /** Legal basis for retention */
  legalBasis: string;
  /** What happens to data after retention period */
  disposalMethod: "anonymize" | "delete" | "archive";
}

/** Breach notification record (must notify CAI within 72 hours) */
export interface BreachRecord {
  id: string;
  detectedAt: string;
  /** CAI notification deadline: detectedAt + 72h */
  notificationDeadline: string;
  caiNotifiedAt?: string;
  affectedUsers: number;
  affectedCategories: PIICategory[];
  description: string;
  containmentActions: string[];
  status: "detected" | "contained" | "reported" | "resolved";
}
