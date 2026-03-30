import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Demande de soutien reçue — #{ticketId}",
  en: "Support request received — #{ticketId}",
  es: "Solicitud de soporte recibida — #{ticketId}",
};

export function subject(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const id = ((data["ticketId"] as string) ?? "").slice(0, 8);
  return subjects[locale].replace("{ticketId}", id);
}

export function html(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const name = data.firstName ?? "";
  const ticketSubject = (data["ticketSubject"] as string) ?? "";

  const content: Record<EmailLocale, string> = {
    fr: `<p>Bonjour${name ? ` ${name}` : ""},</p>
      <p>Votre demande de soutien a bien &eacute;t&eacute; re&ccedil;ue.</p>
      <p><strong>Sujet :</strong> ${ticketSubject}</p>
      <p>Notre &eacute;quipe examinera votre demande dans les meilleurs d&eacute;lais.</p>`,
    en: `<p>Hello${name ? ` ${name}` : ""},</p>
      <p>Your support request has been received.</p>
      <p><strong>Subject:</strong> ${ticketSubject}</p>
      <p>Our team will review your request as soon as possible.</p>`,
    es: `<p>Hola${name ? ` ${name}` : ""},</p>
      <p>Su solicitud de soporte ha sido recibida.</p>
      <p><strong>Asunto:</strong> ${ticketSubject}</p>
      <p>Nuestro equipo revisar&aacute; su solicitud lo antes posible.</p>`,
  };

  return wrapLayout(content[locale], data.tenant);
}
