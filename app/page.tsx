import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notis — Personal digital notice board",
  description:
    "Build a personal page that shares what you're reading, building, and listening to.",
};

export default async function Home(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Notis
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-14 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl space-y-5">
          <p className="text-sm font-medium text-muted-foreground">Personal digital notice board</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Share what you&apos;re reading, building, and listening to.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Notis is a single page for your current context: custom notes, reading list,
            Substack posts, GitHub activity, Spotify listening, and more.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={user ? "/dashboard/widgets" : "/signup"}>Create your board</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/u/demo">View demo board</Link>
            </Button>
          </div>
        </div>

        <div className="w-full max-w-md space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">What comes with a Notis board</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Mobile-first public profile at `/u/username`</li>
            <li>• Bento layout with provider-based widgets</li>
            <li>• Provider integrations: Substack, GitHub, Spotify, Twitter</li>
            <li>• Manual widgets: custom text, location, reading list</li>
          </ul>
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground">
          <p>Made with Notis</p>
          <Link href="/signup" className="underline underline-offset-4">
            Start free
          </Link>
        </div>
      </footer>
    </main>
  );
}
