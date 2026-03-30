import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Mise à jour de votre demande — #{ticketId}",
  en: "Your request has been updated — #{ticketId}",
  es: "Su solicitud ha sido actualizada — #{ticketId}",
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
  const newStatus = (data["newStatus"] as string) ?? "";

  const statusLabels: Record<string, Record<EmailLocale, string>> = {
    open: { fr: "Ouvert", en: "Open", es: "Abierto" },
    in_progress: { fr: "En cours", en: "In progress", es: "En progreso" },
    resolved: { fr: "Résolu", en: "Resolved", es: "Resuelto" },
    closed: { fr: "Fermé", en: "Closed", es: "Cerrado" },
  };
  const status = statusLabels[newStatus]?.[locale] ?? newStatus;

  const content: Record<EmailLocale, string> = {
    fr: `<p>Bonjour${name ? ` ${name}` : ""},</p>
      <p>Le statut de votre demande <strong>${ticketSubject}</strong> a &eacute;t&eacute; mis &agrave; jour.</p>
      <p><strong>Nouveau statut :</strong> ${status}</p>`,
    en: `<p>Hello${name ? ` ${name}` : ""},</p>
      <p>The status of your request <strong>${ticketSubject}</strong> has been updated.</p>
      <p><strong>New status:</strong> ${status}</p>`,
    es: `<p>Hola${name ? ` ${name}` : ""},</p>
      <p>El estado de su solicitud <strong>${ticketSubject}</strong> ha sido actualizado.</p>
      <p><strong>Nuevo estado:</strong> ${status}</p>`,
  };

  return wrapLayout(content[locale], data.tenant);
}
