import Link from "next/link";
import { redirect } from "next/navigation";
import { WidgetGridPreview } from "@/components/dashboard/widget-grid-preview";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/server/profiles";
import { listWidgetInstancesByUserId } from "@/lib/server/widgets";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, widgets] = await Promise.all([
    getProfileByUserId(user.id),
    listWidgetInstancesByUserId(user.id),
  ]);

  const visibleCount = widgets.filter((widget) => widget.is_visible).length;

  return (
    <section className="space-y-6 pb-20 md:pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Monitor your public board and jump into editing quickly.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Public URL</p>
          <p className="mt-2 truncate text-sm font-medium">{`/u/${profile.username}`}</p>
        </article>
        <article className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Widgets total</p>
          <p className="mt-2 text-2xl font-semibold">{widgets.length}</p>
        </article>
        <article className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Visible widgets</p>
          <p className="mt-2 text-2xl font-semibold">{visibleCount}</p>
        </article>
        <article className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Display name</p>
          <p className="mt-2 truncate text-sm font-medium">
            {profile.display_name || profile.username}
          </p>
        </article>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/dashboard/widgets">Manage widgets</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/settings">Edit profile</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/u/${profile.username}`}>View public board</Link>
        </Button>
      </div>

      <WidgetGridPreview widgets={widgets} />
    </section>
  );
}
