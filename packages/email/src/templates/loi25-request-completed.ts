import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Votre demande Loi 25 a été traitée",
  en: "Your Loi 25 request has been processed",
  es: "Su solicitud Ley 25 ha sido procesada",
};

export function subject(data: EmailData): string {
  return subjects[data.locale ?? "fr"];
}

export function html(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const name = data.firstName ?? "";
  const type = (data["requestType"] as string) ?? "";
  const outcome = (data["outcome"] as string) ?? "completed";
  const reason = (data["reason"] as string) ?? "";
  const approved = outcome === "completed" || outcome === "approved";

  const content: Record<EmailLocale, string> = {
    fr: `<p>Bonjour${name ? ` ${name}` : ""},</p>
      <p>Votre demande de <strong>${type}</strong> a &eacute;t&eacute; trait&eacute;e.</p>
      <p><strong>R&eacute;sultat :</strong> ${approved ? "Approuv&eacute;e" : "Refus&eacute;e"}</p>
      ${reason ? `<p><strong>Motif :</strong> ${reason}</p>` : ""}`,
    en: `<p>Hello${name ? ` ${name}` : ""},</p>
      <p>Your <strong>${type}</strong> request has been processed.</p>
      <p><strong>Outcome:</strong> ${approved ? "Approved" : "Denied"}</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}`,
    es: `<p>Hola${name ? ` ${name}` : ""},</p>
      <p>Su solicitud de <strong>${type}</strong> ha sido procesada.</p>
      <p><strong>Resultado:</strong> ${approved ? "Aprobada" : "Rechazada"}</p>
      ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ""}`,
  };

  return wrapLayout(content[locale], data.tenant);
}
