import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Votre demande Loi 25 a été reçue",
  en: "Your Loi 25 request has been received",
  es: "Su solicitud Ley 25 ha sido recibida",
};

export function subject(data: EmailData): string {
  return subjects[data.locale ?? "fr"];
}

export function html(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const name = data.firstName ?? "";
  const type = (data["requestType"] as string) ?? "";
  const deadline = (data["deadline"] as string) ?? "";

  const content: Record<EmailLocale, string> = {
    fr: `<p>Bonjour${name ? ` ${name}` : ""},</p>
      <p>Nous avons re&ccedil;u votre demande de <strong>${type}</strong> en vertu de la Loi 25.</p>
      <p>Nous traiterons votre demande au plus tard le <strong>${deadline}</strong> (30 jours).</p>`,
    en: `<p>Hello${name ? ` ${name}` : ""},</p>
      <p>We received your <strong>${type}</strong> request under Loi 25.</p>
      <p>We will process your request by <strong>${deadline}</strong> (30 days).</p>`,
    es: `<p>Hola${name ? ` ${name}` : ""},</p>
      <p>Hemos recibido su solicitud de <strong>${type}</strong> bajo la Ley 25.</p>
      <p>Procesaremos su solicitud antes del <strong>${deadline}</strong> (30 d&iacute;as).</p>`,
  };

  return wrapLayout(content[locale], data.tenant);
}
