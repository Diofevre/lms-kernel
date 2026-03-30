import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Mise \u00e0 jour \u2014 #{id}",
  en: "Update \u2014 #{id}",
  es: "Actualizaci\u00f3n \u2014 #{id}",
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
  const newStatus = (data["newStatus"] as string) ?? "";
  const greeting = firstName ? ` ${firstName}` : "";

  const statusMap: Record<string, Record<EmailLocale, { label: string; color: string }>> = {
    open: { fr: { label: "Ouvert", color: "#f59e0b" }, en: { label: "Open", color: "#f59e0b" }, es: { label: "Abierto", color: "#f59e0b" } },
    in_progress: { fr: { label: "En cours", color: "#3b82f6" }, en: { label: "In progress", color: "#3b82f6" }, es: { label: "En progreso", color: "#3b82f6" } },
    resolved: { fr: { label: "R\u00e9solu", color: "#10b981" }, en: { label: "Resolved", color: "#10b981" }, es: { label: "Resuelto", color: "#10b981" } },
    closed: { fr: { label: "Ferm\u00e9", color: "#71717a" }, en: { label: "Closed", color: "#71717a" }, es: { label: "Cerrado", color: "#71717a" } },
  };

  const s = statusMap[newStatus]?.[locale] ?? { label: newStatus, color: "#71717a" };

  const statusBadge = `<span style="display:inline-block;padding:4px 12px;background-color:${s.color};color:#ffffff;font-size:12px;font-weight:600;border-radius:999px;letter-spacing:0.3px;">${s.label}</span>`;

  const bodies: Record<EmailLocale, string> = {
    fr: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Mise &agrave; jour de votre demande</h1>
<p style="margin:0 0 12px 0;">Bonjour${greeting},</p>
<p style="margin:0 0 20px 0;">Le statut de votre demande <strong>&laquo; ${ticketSubject} &raquo;</strong> a chang&eacute;.</p>
<p style="margin:0 0 20px 0;">Nouveau statut : ${statusBadge}</p>
<p style="margin:0;font-size:13px;color:#71717a;">Si vous avez des questions, n&rsquo;h&eacute;sitez pas &agrave; r&eacute;pondre &agrave; ce courriel.</p>`,

    en: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Request updated</h1>
<p style="margin:0 0 12px 0;">Hello${greeting},</p>
<p style="margin:0 0 20px 0;">The status of your request <strong>&ldquo;${ticketSubject}&rdquo;</strong> has changed.</p>
<p style="margin:0 0 20px 0;">New status: ${statusBadge}</p>
<p style="margin:0;font-size:13px;color:#71717a;">If you have any questions, feel free to reply to this email.</p>`,

    es: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Solicitud actualizada</h1>
<p style="margin:0 0 12px 0;">Hola${greeting},</p>
<p style="margin:0 0 20px 0;">El estado de su solicitud <strong>&laquo; ${ticketSubject} &raquo;</strong> ha cambiado.</p>
<p style="margin:0 0 20px 0;">Nuevo estado: ${statusBadge}</p>
<p style="margin:0;font-size:13px;color:#71717a;">Si tiene preguntas, responda a este correo.</p>`,
  };

  return wrapLayout(bodies[locale], data.tenant);
}
