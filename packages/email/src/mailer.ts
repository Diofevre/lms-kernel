import { createTransport, type Transporter } from "nodemailer";
import type { SmtpConfig, EmailTemplate, EmailData } from "./types.js";
import { getTemplate } from "./templates/index.js";

/**
 * KernMailer — transactional email sender.
 */
export class KernMailer {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: SmtpConfig) {
    this.from = config.from;
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
  }

  async sendEmail(to: string, template: EmailTemplate, data: EmailData = {}): Promise<void> {
    const tpl = getTemplate(template);
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: tpl.subject(data),
      html: tpl.html(data),
    });
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

/** Factory — reads SMTP config from environment variables */
export function createMailer(): KernMailer {
  return new KernMailer({
    host: process.env["SMTP_HOST"] ?? "localhost",
    port: parseInt(process.env["SMTP_PORT"] ?? "587", 10),
    secure: process.env["SMTP_SECURE"] === "true",
    user: process.env["SMTP_USER"] ?? "",
    pass: process.env["SMTP_PASS"] ?? "",
    from: process.env["SMTP_FROM"] ?? "Kern <noreply@example.com>",
  });
}
