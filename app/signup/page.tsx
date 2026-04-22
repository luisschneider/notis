import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default function SignupPage(): React.JSX.Element {
  return (
    <AuthShell
      title="Create your Notis board"
      description="Set up your account with a unique public username."
    >
      <SignupForm />
    </AuthShell>
  );
}
