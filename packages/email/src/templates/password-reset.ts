import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "Réinitialisation de votre mot de passe",
  en: "Reset your password",
  es: "Restablecer su contraseña",
};

export function subject(data: EmailData): string {
  return subjects[data.locale ?? "fr"];
}

export function html(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const name = data.firstName ?? "";
  const color = data.tenant?.primaryColor ?? "#0f172a";
  const url = (data["resetUrl"] as string) ?? "#";

  const content: Record<EmailLocale, string> = {
    fr: `<p>Bonjour${name ? ` ${name}` : ""},</p>
      <p>Cliquez sur le bouton ci-dessous pour r&eacute;initialiser votre mot de passe.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">R&eacute;initialiser</a>
      </p>
      <p>Ce lien expire dans 60 minutes.</p>`,
    en: `<p>Hello${name ? ` ${name}` : ""},</p>
      <p>Click the button below to reset your password.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Reset password</a>
      </p>
      <p>This link expires in 60 minutes.</p>`,
    es: `<p>Hola${name ? ` ${name}` : ""},</p>
      <p>Haga clic en el bot&oacute;n a continuaci&oacute;n para restablecer su contrase&ntilde;a.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Restablecer</a>
      </p>
      <p>Este enlace expira en 60 minutos.</p>`,
  };

  return wrapLayout(content[locale], data.tenant);
}
