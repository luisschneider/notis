"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { FieldError } from "@/components/ui/field-error";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { loginInputSchema } from "@/lib/validation/auth";

type LoginValues = z.infer<typeof loginInputSchema>;

interface LoginFormProps {
  redirectTo?: string;
}

const FALLBACK_ERROR = "Unable to sign in right now. Please try again.";

function parseFormData(formData: FormData): LoginValues {
  const parsed = loginInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
}

export function LoginForm({ redirectTo = "/dashboard/settings" }: LoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const values = parseFormData(new FormData(event.currentTarget));
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword(values);

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (submitError: unknown) {
      if (submitError instanceof z.ZodError) {
        setError(submitError.issues[0]?.message ?? FALLBACK_ERROR);
        return;
      }
      setError(FALLBACK_ERROR);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMagicLink(): Promise<void> {
    setError(null);
    setIsLoading(true);

    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
    const email = emailInput?.value ?? "";

    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) {
      setError("Enter a valid email before requesting a magic link.");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (otpError) {
      setError(otpError.message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setError("Magic link sent. Check your inbox.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in with password or request a magic link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>

          <FieldError message={error} />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          onClick={handleMagicLink}
          disabled={isLoading}
        >
          Send magic link
        </Button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          New to Notis?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
