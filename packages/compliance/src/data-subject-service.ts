/**
 * @kern/compliance — Data subject request service (Loi 25 Art. 27-28)
 *
 * Handles access, correction, deletion, and portability requests.
 * Uses a minimal DB interface to avoid circular deps with @kern/db.
 */

export interface DataSubjectDb {
  request: {
    create(args: { data: RequestCreateData }): Promise<RequestRow>;
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<RequestRow[]>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<RequestRow>;
  };
}

interface RequestCreateData {
  tenantId: string;
  userId: string;
  type: string;
  deadline: Date;
}

interface RequestRow {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  status: string;
  requestedAt: Date;
  deadline: Date;
  completedAt: Date | null;
  denialReason: string | null;
}

/** Loi 25 mandates a 30-day response deadline for data subject requests. */
const LOI25_DEADLINE_DAYS = 30;

export class DataSubjectService {
  constructor(private readonly db: DataSubjectDb) {}

  async createAccessRequest(userId: string, tenantId: string): Promise<RequestRow> {
    return this.createRequest(userId, tenantId, "access");
  }

  async createDeletionRequest(userId: string, tenantId: string): Promise<RequestRow> {
    return this.createRequest(userId, tenantId, "deletion");
  }

  async createCorrectionRequest(userId: string, tenantId: string): Promise<RequestRow> {
    return this.createRequest(userId, tenantId, "correction");
  }

  async createPortabilityRequest(userId: string, tenantId: string): Promise<RequestRow> {
    return this.createRequest(userId, tenantId, "portability");
  }

  private async createRequest(userId: string, tenantId: string, type: string): Promise<RequestRow> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + LOI25_DEADLINE_DAYS);
    return this.db.request.create({
      data: { tenantId, userId, type, deadline },
    });
  }

  async processRequest(requestId: string, action: "complete" | "deny", denialReason?: string): Promise<RequestRow> {
    if (action === "deny" && !denialReason) {
      throw new Error("Denial reason is required when denying a request");
    }
    return this.db.request.update({
      where: { id: requestId },
      data: {
        status: action === "complete" ? "completed" : "denied",
        completedAt: new Date(),
        ...(denialReason ? { denialReason } : {}),
      },
    });
  }

  async getOverdueRequests(tenantId: string): Promise<RequestRow[]> {
    return this.db.request.findMany({
      where: {
        tenantId,
        status: "pending",
        deadline: { lt: new Date() },
      },
      orderBy: { deadline: "asc" },
    });
  }

  async getPendingRequests(tenantId: string): Promise<RequestRow[]> {
    return this.db.request.findMany({
      where: { tenantId, status: "pending" },
      orderBy: { requestedAt: "asc" },
    });
  }
}
