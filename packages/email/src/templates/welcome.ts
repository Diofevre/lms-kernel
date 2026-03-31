import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout, ctaButton, escapeHtml } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Bienvenue sur {name}",
  en: "Welcome to {name}",
  es: "Bienvenido a {name}",
};

export function subject(data: EmailData): string {
  const locale = data.locale ?? "fr";
  return subjects[locale].replace("{name}", data.tenant?.name ?? "Kern");
}

export function html(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const firstName = data.firstName ?? "";
  const color = data.tenant?.primaryColor ?? "#0f172a";
  const url = (data["loginUrl"] as string) ?? "#";

  const greeting = firstName ? ` ${escapeHtml(firstName)}` : "";

  const bodies: Record<EmailLocale, string> = {
    fr: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Bienvenue${greeting} !</h1>
<p style="margin:0 0 12px 0;">Votre compte a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s. Vous pouvez d&egrave;s maintenant vous connecter et acc&eacute;der &agrave; votre espace.</p>
${ctaButton("Se connecter", url, color)}
<p style="margin:0;font-size:13px;color:#71717a;">Si vous n&rsquo;avez pas demand&eacute; la cr&eacute;ation de ce compte, ignorez simplement ce courriel.</p>`,

    en: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Welcome${greeting}!</h1>
<p style="margin:0 0 12px 0;">Your account has been created successfully. You can now sign in and access your workspace.</p>
${ctaButton("Sign in", url, color)}
<p style="margin:0;font-size:13px;color:#71717a;">If you did not request this account, you can safely ignore this email.</p>`,

    es: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">&iexcl;Bienvenido${greeting}!</h1>
<p style="margin:0 0 12px 0;">Su cuenta ha sido creada exitosamente. Ya puede iniciar sesi&oacute;n y acceder a su espacio.</p>
${ctaButton("Iniciar sesi\u00f3n", url, color)}
<p style="margin:0;font-size:13px;color:#71717a;">Si no solicit&oacute; esta cuenta, ignore este correo.</p>`,
  };

  return wrapLayout(bodies[locale], data.tenant);
}
