import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { SessionGuard } from "@/components/shell/session-guard";

/**
 * Shell layout — wraps all authenticated pages.
 * SessionGuard ensures the user has a valid session before rendering content.
 * If session expires or is invalidated, the user is redirected to /login.
 */
export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main id="main-content" className="flex-1 p-6 bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </SessionGuard>
  );
}
