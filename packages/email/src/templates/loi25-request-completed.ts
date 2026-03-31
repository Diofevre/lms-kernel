import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout, escapeHtml } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Votre demande Loi 25 a \u00e9t\u00e9 trait\u00e9e",
  en: "Your Loi 25 request has been processed",
  es: "Su solicitud Ley 25 ha sido procesada",
};

export function subject(data: EmailData): string {
  return subjects[data.locale ?? "fr"];
}

export function html(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const firstName = data.firstName ?? "";
  const type = (data["requestType"] as string) ?? "";
  const outcome = (data["outcome"] as string) ?? "completed";
  const reason = (data["reason"] as string) ?? "";
  const approved = outcome === "completed" || outcome === "approved";
  const greeting = firstName ? ` ${escapeHtml(firstName)}` : "";
  const safeType = escapeHtml(type);
  const safeReason = reason ? escapeHtml(reason) : "";

  const badge = approved
    ? `<span style="display:inline-block;padding:4px 12px;background-color:#10b981;color:#fff;font-size:12px;font-weight:600;border-radius:999px;">Approuv&eacute;e</span>`
    : `<span style="display:inline-block;padding:4px 12px;background-color:#ef4444;color:#fff;font-size:12px;font-weight:600;border-radius:999px;">Refus&eacute;e</span>`;

  const badgeEn = approved
    ? `<span style="display:inline-block;padding:4px 12px;background-color:#10b981;color:#fff;font-size:12px;font-weight:600;border-radius:999px;">Approved</span>`
    : `<span style="display:inline-block;padding:4px 12px;background-color:#ef4444;color:#fff;font-size:12px;font-weight:600;border-radius:999px;">Denied</span>`;

  const badgeEs = approved
    ? `<span style="display:inline-block;padding:4px 12px;background-color:#10b981;color:#fff;font-size:12px;font-weight:600;border-radius:999px;">Aprobada</span>`
    : `<span style="display:inline-block;padding:4px 12px;background-color:#ef4444;color:#fff;font-size:12px;font-weight:600;border-radius:999px;">Rechazada</span>`;

  const reasonBlock = reason ? `<p style="margin:16px 0 0 0;padding:12px 16px;background-color:#fef2f2;border-radius:8px;font-size:13px;color:#991b1b;"><strong>Motif :</strong> ${safeReason}</p>` : "";
  const reasonBlockEn = reason ? `<p style="margin:16px 0 0 0;padding:12px 16px;background-color:#fef2f2;border-radius:8px;font-size:13px;color:#991b1b;"><strong>Reason:</strong> ${safeReason}</p>` : "";
  const reasonBlockEs = reason ? `<p style="margin:16px 0 0 0;padding:12px 16px;background-color:#fef2f2;border-radius:8px;font-size:13px;color:#991b1b;"><strong>Motivo:</strong> ${safeReason}</p>` : "";

  const bodies: Record<EmailLocale, string> = {
    fr: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Demande Loi 25 trait&eacute;e</h1>
<p style="margin:0 0 12px 0;">Bonjour${greeting},</p>
<p style="margin:0 0 12px 0;">Votre demande de <strong>${safeType}</strong> a &eacute;t&eacute; trait&eacute;e.</p>
<p style="margin:0 0 20px 0;">R&eacute;sultat : ${badge}</p>
${reasonBlock}
<p style="margin:20px 0 0 0;font-size:13px;color:#71717a;">Pour toute question, contactez le responsable de la protection des renseignements personnels de votre organisation.</p>`,

    en: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Loi 25 request processed</h1>
<p style="margin:0 0 12px 0;">Hello${greeting},</p>
<p style="margin:0 0 12px 0;">Your <strong>${safeType}</strong> request has been processed.</p>
<p style="margin:0 0 20px 0;">Outcome: ${badgeEn}</p>
${reasonBlockEn}
<p style="margin:20px 0 0 0;font-size:13px;color:#71717a;">For any questions, contact your organization&rsquo;s privacy officer.</p>`,

    es: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Solicitud Ley 25 procesada</h1>
<p style="margin:0 0 12px 0;">Hola${greeting},</p>
<p style="margin:0 0 12px 0;">Su solicitud de <strong>${safeType}</strong> ha sido procesada.</p>
<p style="margin:0 0 20px 0;">Resultado: ${badgeEs}</p>
${reasonBlockEs}
<p style="margin:20px 0 0 0;font-size:13px;color:#71717a;">Para cualquier pregunta, contacte al oficial de privacidad de su organizaci&oacute;n.</p>`,
  };

  return wrapLayout(bodies[locale], data.tenant);
}
