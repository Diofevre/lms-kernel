import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout, escapeHtml } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Demande re\u00e7ue \u2014 #{id}",
  en: "Request received \u2014 #{id}",
  es: "Solicitud recibida \u2014 #{id}",
};

export function subject(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const id = ((data["ticketId"] as string) ?? "").slice(0, 8);
  return subjects[locale].replace("{id}", id);
}

export function html(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const firstName = data.firstName ?? "";
  const ticketSubject = (data["ticketSubject"] as string) ?? "";
  const ticketId = ((data["ticketId"] as string) ?? "").slice(0, 8);
  const greeting = firstName ? ` ${escapeHtml(firstName)}` : "";
  const safeSubject = escapeHtml(ticketSubject);

  const bodies: Record<EmailLocale, string> = {
    fr: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Demande re&ccedil;ue</h1>
<p style="margin:0 0 12px 0;">Bonjour${greeting},</p>
<p style="margin:0 0 20px 0;">Votre demande de soutien a &eacute;t&eacute; enregistr&eacute;e.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:16px 20px;background-color:#fafafa;">
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">R&eacute;f&eacute;rence</p>
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#18181b;">#${ticketId}</p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Sujet</p>
    <p style="margin:0;font-size:15px;color:#18181b;">${safeSubject}</p>
  </td></tr>
</table>
<p style="margin:0;font-size:13px;color:#71717a;">Notre &eacute;quipe examinera votre demande dans les meilleurs d&eacute;lais. Vous serez notifi&eacute; d&egrave;s qu&rsquo;il y aura une mise &agrave; jour.</p>`,

    en: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Request received</h1>
<p style="margin:0 0 12px 0;">Hello${greeting},</p>
<p style="margin:0 0 20px 0;">Your support request has been recorded.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:16px 20px;background-color:#fafafa;">
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Reference</p>
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#18181b;">#${ticketId}</p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Subject</p>
    <p style="margin:0;font-size:15px;color:#18181b;">${safeSubject}</p>
  </td></tr>
</table>
<p style="margin:0;font-size:13px;color:#71717a;">Our team will review your request shortly. You will be notified when there is an update.</p>`,

    es: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Solicitud recibida</h1>
<p style="margin:0 0 12px 0;">Hola${greeting},</p>
<p style="margin:0 0 20px 0;">Su solicitud de soporte ha sido registrada.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:16px 20px;background-color:#fafafa;">
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Referencia</p>
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#18181b;">#${ticketId}</p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Asunto</p>
    <p style="margin:0;font-size:15px;color:#18181b;">${safeSubject}</p>
  </td></tr>
</table>
<p style="margin:0;font-size:13px;color:#71717a;">Nuestro equipo revisar&aacute; su solicitud a la brevedad.</p>`,
  };

  return wrapLayout(bodies[locale], data.tenant);
}
