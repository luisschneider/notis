import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with password or magic link."
    >
      <LoginForm />
    </AuthShell>
  );
}
