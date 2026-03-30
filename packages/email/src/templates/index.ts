import type { EmailTemplate, EmailData } from "../types.js";

import * as welcome from "./welcome.js";
import * as passwordReset from "./password-reset.js";
import * as ticketReceived from "./ticket-received.js";
import * as ticketUpdated from "./ticket-updated.js";
import * as loi25Received from "./loi25-request-received.js";
import * as loi25Completed from "./loi25-request-completed.js";

interface TemplateModule {
  subject(data: EmailData): string;
  html(data: EmailData): string;
}

const templates: Record<EmailTemplate, TemplateModule> = {
  "welcome": welcome,
  "password-reset": passwordReset,
  "ticket-received": ticketReceived,
  "ticket-updated": ticketUpdated,
  "loi25-request-received": loi25Received,
  "loi25-request-completed": loi25Completed,
};

export function getTemplate(name: EmailTemplate): TemplateModule {
  const tpl = templates[name];
  if (!tpl) throw new Error(`Unknown email template: ${name}`);
  return tpl;
}
