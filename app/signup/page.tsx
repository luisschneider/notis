import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

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
