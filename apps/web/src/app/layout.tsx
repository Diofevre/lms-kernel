import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Kern",
  description: "Institutional application kernel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <a href="#main-content" className="skip-nav">
          Aller au contenu principal
        </a>
        <AuthSessionProvider>
          <main id="main-content">{children}</main>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
