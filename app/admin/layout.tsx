import { requireAdmin } from "@/lib/server/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({
  children,
}: AdminLayoutProps): Promise<React.JSX.Element> {
  const result = await requireAdmin();

  if (!result.isAdmin) {
    redirect(result.redirect);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold tracking-tight" href="/admin">
              Notis Admin
            </Link>
            <span className="text-xs text-muted-foreground">
              {result.email}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Back to Dashboard
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <div className="flex">
        <AdminNav />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
