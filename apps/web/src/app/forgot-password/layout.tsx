import { AuthLeftPanel } from "@/components/auth/auth-left-panel";

/**
 * Forgot-password layout — same split layout as login.
 */
export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2">
        <AuthLeftPanel />
      </div>
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        {children}
      </div>
    </div>
  );
}
