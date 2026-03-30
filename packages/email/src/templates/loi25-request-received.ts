import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Votre demande Loi 25 a \u00e9t\u00e9 re\u00e7ue",
  en: "Your Loi 25 request has been received",
  es: "Su solicitud Ley 25 ha sido recibida",
};

export function subject(data: EmailData): string {
  return subjects[data.locale ?? "fr"];
}

export function html(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const firstName = data.firstName ?? "";
  const type = (data["requestType"] as string) ?? "";
  const deadline = (data["deadline"] as string) ?? "";
  const greeting = firstName ? ` ${firstName}` : "";

  const bodies: Record<EmailLocale, string> = {
    fr: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Demande Loi 25 enregistr&eacute;e</h1>
<p style="margin:0 0 12px 0;">Bonjour${greeting},</p>
<p style="margin:0 0 20px 0;">Nous avons bien re&ccedil;u votre demande de <strong>${type}</strong> conform&eacute;ment &agrave; la Loi sur la protection des renseignements personnels (Loi 25).</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:16px 20px;background-color:#fafafa;">
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Type de demande</p>
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#18181b;">${type}</p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">&Eacute;ch&eacute;ance l&eacute;gale (30 jours)</p>
    <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;">${deadline}</p>
  </td></tr>
</table>
<p style="margin:0;font-size:13px;color:#71717a;">Vous recevrez une notification lorsque le traitement sera termin&eacute;. Pour toute question, contactez le responsable de la protection des renseignements personnels de votre organisation.</p>`,

    en: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Loi 25 request recorded</h1>
<p style="margin:0 0 12px 0;">Hello${greeting},</p>
<p style="margin:0 0 20px 0;">We have received your <strong>${type}</strong> request under Quebec privacy law (Loi 25).</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:16px 20px;background-color:#fafafa;">
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Request type</p>
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#18181b;">${type}</p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Legal deadline (30 days)</p>
    <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;">${deadline}</p>
  </td></tr>
</table>
<p style="margin:0;font-size:13px;color:#71717a;">You will be notified when processing is complete.</p>`,

    es: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Solicitud Ley 25 registrada</h1>
<p style="margin:0 0 12px 0;">Hola${greeting},</p>
<p style="margin:0 0 20px 0;">Hemos recibido su solicitud de <strong>${type}</strong> bajo la Ley 25 de Quebec.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:16px 20px;background-color:#fafafa;">
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Tipo de solicitud</p>
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#18181b;">${type}</p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Plazo legal (30 d&iacute;as)</p>
    <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;">${deadline}</p>
  </td></tr>
</table>
<p style="margin:0;font-size:13px;color:#71717a;">Ser&aacute; notificado cuando se complete el procesamiento.</p>`,
  };

  return wrapLayout(bodies[locale], data.tenant);
}
