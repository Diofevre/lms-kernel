import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { TenantThemeProvider } from "@/components/theme/tenant-theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Kern",
  description: "Institutional application kernel",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <a href="#main-content" className="skip-nav">
          {locale === "en" ? "Skip to content" : locale === "es" ? "Ir al contenido" : "Aller au contenu principal"}
        </a>
        <NextIntlClientProvider messages={messages}>
          <AuthSessionProvider>
            <TenantThemeProvider>
              <main id="main-content">{children}</main>
            </TenantThemeProvider>
          </AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
