import { createClient } from "@/lib/supabase/server";

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}

export interface AdminCheckResult {
  isAdmin: true;
  email: string;
}

export async function requireAdmin(): Promise<AdminCheckResult | { isAdmin: false; redirect: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, redirect: "/login" };
  }

  if (!user.email || !isAdminEmail(user.email)) {
    return { isAdmin: false, redirect: "/dashboard" };
  }

  return { isAdmin: true, email: user.email };
}
