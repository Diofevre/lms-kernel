import type { TenantBranding } from "../types.js";

/**
 * Escape HTML to prevent XSS injection in email templates.
 * MUST be applied to ALL user-provided data before interpolation.
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/**
 * Professional HTML email layout — inspired by Stripe/Linear/Resend design patterns.
 *
 * - Max 600px centered container
 * - Clean white card with subtle border
 * - Brand color accent bar at top
 * - Logo + tenant name in header
 * - Professional footer with copyright + legal
 * - All inline CSS (email clients strip <style>)
 * - Responsive (mobile-friendly)
 */
export function wrapLayout(body: string, tenant?: TenantBranding): string {
  const primary = tenant?.primaryColor ?? "#0f172a";
  const name = tenant?.name ?? "Kern";
  const year = new Date().getFullYear();

  const logoHtml = tenant?.logoUrl
    ? `<img src="${tenant.logoUrl}" alt="${name}" style="max-height:32px;display:block;" />`
    : `<span style="font-size:20px;font-weight:700;color:${primary};letter-spacing:-0.5px;">${name}</span>`;

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${name}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- Inner card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background-color:${primary};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Header with logo -->
          <tr>
            <td style="padding:32px 40px 24px 40px;">
              ${logoHtml}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 40px 32px 40px;font-size:15px;line-height:1.7;color:#3f3f46;">
              ${body}
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#e4e4e7;"></div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px 40px;font-size:12px;line-height:1.6;color:#a1a1aa;">
              <p style="margin:0 0 8px 0;">&copy; ${year} ${name}. Tous droits r&eacute;serv&eacute;s.</p>
              <p style="margin:0;">Cet email a &eacute;t&eacute; envoy&eacute; automatiquement. Ne r&eacute;pondez pas &agrave; ce message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** CTA button — centered, rounded, brand-colored */
export function ctaButton(text: string, url: string, color?: string): string {
  const bg = color ?? "#0f172a";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td align="center">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:${bg};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}
