/**
 * @kern/email — Transactional email types
 */

export type EmailTemplate =
  | "welcome"
  | "password-reset"
  | "ticket-received"
  | "ticket-updated"
  | "loi25-request-received"
  | "loi25-request-completed";

export type EmailLocale = "fr" | "en" | "es";

export interface TenantBranding {
  name: string;
  logoUrl?: string | undefined;
  primaryColor: string;
}

export interface EmailData {
  firstName?: string | undefined;
  locale?: EmailLocale | undefined;
  tenant?: TenantBranding | undefined;
  [key: string]: unknown;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}
