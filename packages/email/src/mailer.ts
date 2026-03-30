import { createTransport, type Transporter } from "nodemailer";
import type { SmtpConfig, EmailTemplate, EmailData } from "./types.js";
import { getTemplate } from "./templates/index.js";

/**
 * KernMailer — transactional email sender.
 *
 * NO WORKAROUNDS:
 * - Errors are thrown, not swallowed
 * - Caller is responsible for handling (NestJS EmailService catches and logs)
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
    const subject = tpl.subject(data);
    const html = tpl.html(data);

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (error) {
      throw new Error(
        `Email delivery failed [${template} → ${to}]: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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

/** Factory for noreply emails — reads SMTP config from env */
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

/** Factory for support emails — separate SMTP credentials */
export function createSupportMailer(): KernMailer {
  return new KernMailer({
    host: process.env["SMTP_HOST"] ?? "localhost",
    port: parseInt(process.env["SMTP_PORT"] ?? "587", 10),
    secure: process.env["SMTP_SECURE"] === "true",
    user: process.env["SMTP_SUPPORT_USER"] ?? process.env["SMTP_USER"] ?? "",
    pass: process.env["SMTP_SUPPORT_PASS"] ?? process.env["SMTP_PASS"] ?? "",
    from: process.env["SMTP_SUPPORT_FROM"] ?? process.env["SMTP_FROM"] ?? "Kern Support <support@example.com>",
  });
}
