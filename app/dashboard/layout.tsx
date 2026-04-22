import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "@/components/dashboard/nav";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold tracking-tight" href="/dashboard">
              Notis Dashboard
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Signed in as {user.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <form
              action={async (): Promise<void> => {
                "use server";
                const client = await createClient();
                await client.auth.signOut();
                redirect("/login");
              }}
            >
              <Button size="sm" type="submit" variant="outline">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl">
        <DashboardNav />
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
