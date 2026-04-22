"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signUpInputSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const usernamePattern = /^[a-z0-9_-]{3,30}$/;

type UsernameCheckState =
  | { status: "idle"; message: string | null }
  | { status: "checking"; message: string }
  | { status: "available"; message: string }
  | { status: "unavailable"; message: string };

function normalizeUsername(rawValue: string): string {
  return rawValue.trim().toLowerCase();
}

function isSupabaseAuthError(error: unknown): error is { message: string } {
  return typeof error === "object" && error !== null && "message" in error;
}

export function SignupForm(): React.JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheckState>({
    status: "idle",
    message: null,
  });

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    async function checkUsernameAvailability(): Promise<void> {
      if (!normalizedUsername) {
        setUsernameCheck({ status: "idle", message: null });
        return;
      }

      if (!usernamePattern.test(normalizedUsername)) {
        setUsernameCheck({
          status: "unavailable",
          message: "Use 3-30 characters: lowercase letters, numbers, underscores, hyphens.",
        });
        return;
      }

      setUsernameCheck({ status: "checking", message: "Checking availability..." });

      try {
        const response = await fetch(
          `/api/username/availability?username=${encodeURIComponent(normalizedUsername)}`,
          {
            method: "GET",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Unable to validate username right now.");
        }

        const payload: {
          available: boolean;
          message?: string;
        } = (await response.json()) as {
          available: boolean;
          message?: string;
        };

        if (isCancelled) {
          return;
        }

        setUsernameCheck(
          payload.available
            ? { status: "available", message: "Username is available." }
            : {
                status: "unavailable",
                message: payload.message ?? "This username is already taken.",
              },
        );
      } catch (error: unknown) {
        if (controller.signal.aborted || isCancelled) {
          return;
        }
        setUsernameCheck({
          status: "unavailable",
          message: error instanceof Error ? error.message : "Unable to check username.",
        });
      }
    }

    const timeoutId = setTimeout(() => {
      void checkUsernameAvailability();
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [normalizedUsername]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    const parsed = signUpInputSchema.safeParse({
      email,
      password,
      username: normalizedUsername,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Please correct the highlighted values.");
      return;
    }

    if (usernameCheck.status !== "available") {
      setErrorMessage("Please choose an available username before signing up.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username: parsed.data.username,
            display_name: displayName.trim(),
          },
        },
      });
      if (error) {
        throw error;
      }

      window.location.assign("/dashboard/settings?welcome=1");
    } catch (error: unknown) {
      if (isSupabaseAuthError(error)) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to create account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const usernameMessageClassName =
    usernameCheck.status === "available"
      ? "text-emerald-600"
      : usernameCheck.status === "checking"
        ? "text-muted-foreground"
        : "text-destructive";

  return (
    <Card className="border-border/70 shadow-xs">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Create your Notis board</CardTitle>
        <CardDescription>
          Sign up with email and choose a username for your public board URL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              autoComplete="email"
              id="signup-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              autoComplete="new-password"
              id="signup-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="signup-username">Username</Label>
            <Input
              autoCapitalize="none"
              autoCorrect="off"
              id="signup-username"
              onChange={(event) => setUsername(event.target.value)}
              pattern="[a-z0-9_-]{3,30}"
              placeholder="your-name"
              required
              spellCheck={false}
              value={username}
            />
            {usernameCheck.message ? (
              <p className={`text-xs ${usernameMessageClassName}`}>{usernameCheck.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="signup-display-name">Display name</Label>
            <Input
              id="signup-display-name"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How your name appears on your board"
              value={displayName}
            />
          </div>

          <FieldError message={errorMessage} />

          <Button className="h-11" disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating account
              </>
            ) : (
              "Sign up"
            )}
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-medium text-foreground underline underline-offset-4" href="/login">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
