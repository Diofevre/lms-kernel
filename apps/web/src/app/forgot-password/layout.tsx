/**
 * Forgot-password layout — same centered style as login.
 */
export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      {children}
    </div>
  );
}
