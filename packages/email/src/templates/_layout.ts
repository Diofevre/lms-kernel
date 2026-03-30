import type { TenantBranding } from "../types.js";

/**
 * Shared HTML email layout wrapper.
 * Inline styles only — email clients strip <style> blocks.
 */
export function wrapLayout(body: string, tenant?: TenantBranding): string {
  const primaryColor = tenant?.primaryColor ?? "#0f172a";
  const tenantName = tenant?.name ?? "Kern";
  const logoHtml = tenant?.logoUrl
    ? `<img src="${tenant.logoUrl}" alt="${tenantName}" style="max-height:40px;margin-bottom:16px;" />`
    : `<div style="font-size:24px;font-weight:700;color:${primaryColor};margin-bottom:16px;">${tenantName}</div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:24px 32px;border-bottom:3px solid ${primaryColor};">${logoHtml}</td></tr>
      <tr><td style="padding:32px;font-size:15px;line-height:1.6;color:#334155;">${body}</td></tr>
      <tr><td style="padding:20px 32px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center;">
        &copy; ${new Date().getFullYear()} ${tenantName}. Tous droits r&eacute;serv&eacute;s.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
