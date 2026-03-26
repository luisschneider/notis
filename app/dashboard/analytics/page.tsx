import { redirect } from "next/navigation";
import { Eye, TrendingUp, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAnalyticsForUser } from "@/lib/server/analytics";
import { ViewsOverTimeChart, TopReferrersTable } from "@/components/dashboard/analytics-charts";

export default async function AnalyticsPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const analytics = await getAnalyticsForUser(user.id);

  const todayViews = analytics.viewsOverTime.at(-1)?.views ?? 0;
  const yesterdayViews = analytics.viewsOverTime.at(-2)?.views ?? 0;
  const weekViews = analytics.viewsOverTime.slice(-7).reduce((sum, d) => sum + d.views, 0);

  return (
    <section className="space-y-6 pb-20 md:pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          See how people are discovering and viewing your board.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Views</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{analytics.totalViews.toLocaleString()}</p>
        </article>
        <article className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Today</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{todayViews.toLocaleString()}</p>
          {yesterdayViews > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {todayViews >= yesterdayViews ? "+" : ""}
              {todayViews - yesterdayViews} vs yesterday
            </p>
          )}
        </article>
        <article className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Last 7 Days</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{weekViews.toLocaleString()}</p>
        </article>
        <article className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Top Referrers</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{analytics.topReferrers.length}</p>
        </article>
      </div>

      <ViewsOverTimeChart data={analytics.viewsOverTime} />

      <TopReferrersTable data={analytics.topReferrers} />
    </section>
  );
}
