/**
 * @kern/compliance — Consent record CRUD manager (Loi 25)
 *
 * Uses a minimal DB interface to avoid circular deps with @kern/db.
 * Callers inject a Prisma-compatible client at construction time.
 */

export interface ConsentDb {
  consent: {
    create(args: { data: ConsentCreateData }): Promise<ConsentRow>;
    findMany(args: { where: Record<string, unknown> }): Promise<ConsentRow[]>;
    findFirst(args: { where: Record<string, unknown> }): Promise<ConsentRow | null>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<ConsentRow>;
  };
}

interface ConsentCreateData {
  tenantId: string;
  userId: string;
  categories: string[];
  purpose: string;
  method: string;
  ipHash: string;
  expiresAt?: Date | null;
}

interface ConsentRow {
  id: string;
  tenantId: string;
  userId: string;
  categories: string[];
  purpose: string;
  method: string;
  ipHash: string;
  givenAt: Date;
  expiresAt: Date | null;
  withdrawnAt: Date | null;
}

export class ConsentManager {
  constructor(private readonly db: ConsentDb) {}

  async grantConsent(input: {
    tenantId: string;
    userId: string;
    categories: string[]; // PIICategory[]
    purpose: string;
    method: "explicit_checkbox" | "signed_form" | "verbal_recorded";
    ipHash: string;
    expiresAt?: Date;
  }): Promise<ConsentRow> {
    return this.db.consent.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        categories: input.categories,
        purpose: input.purpose,
        method: input.method,
        ipHash: input.ipHash,
        expiresAt: input.expiresAt ?? null,
      },
    });
  }

  async withdrawConsent(consentId: string): Promise<ConsentRow> {
    return this.db.consent.update({
      where: { id: consentId },
      data: { withdrawnAt: new Date() },
    });
  }

  async getActiveConsents(userId: string, tenantId: string): Promise<ConsentRow[]> {
    return this.db.consent.findMany({
      where: {
        userId,
        tenantId,
        withdrawnAt: null,
      },
    });
  }

  async hasConsentFor(userId: string, tenantId: string, category: string): Promise<boolean> {
    const consent = await this.db.consent.findFirst({
      where: {
        userId,
        tenantId,
        withdrawnAt: null,
        categories: { has: category },
      },
    });
    return consent !== null;
  }
}
