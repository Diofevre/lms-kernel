import { AuthLeftPanel } from "@/components/auth/auth-left-panel";

/**
 * Login layout — split screen adapted from MyATPS:
 * Left: decorative panel with rounded corners (hidden on mobile)
 * Right: centered form on white background
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex p-4 bg-white">
      {/* Left panel — rounded, hidden on mobile */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <AuthLeftPanel />
      </div>

      {/* Right panel — form centered */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[440px]">
          {children}
        </div>
      </div>
    </div>
  );
}
