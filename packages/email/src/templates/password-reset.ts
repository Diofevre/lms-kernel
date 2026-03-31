import type { EmailData, EmailLocale } from "../types.js";
import { wrapLayout, ctaButton, escapeHtml } from "./_layout.js";

const subjects: Record<EmailLocale, string> = {
  fr: "R\u00e9initialisez votre mot de passe",
  en: "Reset your password",
  es: "Restablezca su contrase\u00f1a",
};

export function subject(data: EmailData): string {
  return subjects[data.locale ?? "fr"];
}

export function html(data: EmailData): string {
  const locale = data.locale ?? "fr";
  const firstName = data.firstName ?? "";
  const color = data.tenant?.primaryColor ?? "#0f172a";
  const url = (data["resetUrl"] as string) ?? "#";
  const greeting = firstName ? ` ${escapeHtml(firstName)}` : "";

  const bodies: Record<EmailLocale, string> = {
    fr: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">R&eacute;initialisation du mot de passe</h1>
<p style="margin:0 0 12px 0;">Bonjour${greeting},</p>
<p style="margin:0 0 12px 0;">Nous avons re&ccedil;u une demande de r&eacute;initialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
${ctaButton("R\u00e9initialiser mon mot de passe", url, color)}
<p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">Ce lien expire dans <strong>60 minutes</strong>.</p>
<p style="margin:0;font-size:13px;color:#71717a;">Si vous n&rsquo;avez pas fait cette demande, ignorez ce courriel. Votre mot de passe ne sera pas modifi&eacute;.</p>`,

    en: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Password Reset</h1>
<p style="margin:0 0 12px 0;">Hello${greeting},</p>
<p style="margin:0 0 12px 0;">We received a request to reset your password. Click the button below to choose a new one.</p>
${ctaButton("Reset my password", url, color)}
<p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">This link expires in <strong>60 minutes</strong>.</p>
<p style="margin:0;font-size:13px;color:#71717a;">If you didn&rsquo;t request this, ignore this email. Your password won&rsquo;t change.</p>`,

    es: `<h1 style="font-size:22px;font-weight:700;color:#18181b;margin:0 0 16px 0;">Restablecer contrase&ntilde;a</h1>
<p style="margin:0 0 12px 0;">Hola${greeting},</p>
<p style="margin:0 0 12px 0;">Recibimos una solicitud para restablecer su contrase&ntilde;a. Haga clic en el bot&oacute;n a continuaci&oacute;n.</p>
${ctaButton("Restablecer mi contrase\u00f1a", url, color)}
<p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">Este enlace expira en <strong>60 minutos</strong>.</p>
<p style="margin:0;font-size:13px;color:#71717a;">Si no solicit&oacute; esto, ignore este correo.</p>`,
  };

  return wrapLayout(bodies[locale], data.tenant);
}
