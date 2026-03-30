import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Bienvenue sur {tenantName}",
  en: "Welcome to {tenantName}",
  es: "Bienvenido a {tenantName}",
};

export function subject(data: EmailData): string {
  const locale = data.locale ?? "fr";
  return subjects[locale].replace("{tenantName}", data.tenant?.name ?? "Kern");
}

export function html(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const name = data.firstName ?? "";
  const color = data.tenant?.primaryColor ?? "#0f172a";
  const url = (data["loginUrl"] as string) ?? "#";

  const content: Record<EmailLocale, string> = {
    fr: `<p>Bonjour${name ? ` ${name}` : ""},</p>
      <p>Votre compte a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Se connecter</a>
      </p>`,
    en: `<p>Hello${name ? ` ${name}` : ""},</p>
      <p>Your account has been created successfully.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Sign in</a>
      </p>`,
    es: `<p>Hola${name ? ` ${name}` : ""},</p>
      <p>Su cuenta ha sido creada exitosamente.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Iniciar sesi&oacute;n</a>
      </p>`,
  };

  return wrapLayout(content[locale], data.tenant);
}
