"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Link2, LayoutGrid, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SignOutButton } from "./sign-out-button";

interface DashboardNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/widgets", label: "Widgets", icon: LayoutGrid },
  { href: "/dashboard/connections", label: "Connections", icon: Link2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r md:block">
        <div className="sticky top-0 flex h-screen flex-col gap-3 p-4">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold">
            <User className="size-4" />
            Notis Dashboard
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  className="justify-start"
                >
                  <Link href={item.href}>
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
          <div className="mt-auto">
            <SignOutButton />
          </div>
        </div>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/90 backdrop-blur-sm md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
