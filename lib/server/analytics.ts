import { createClient } from "@/lib/supabase/server";

export interface DailyViewCount {
  date: string;
  views: number;
}

export interface ReferrerCount {
  referrer: string;
  count: number;
}

export interface AnalyticsData {
  totalViews: number;
  viewsOverTime: DailyViewCount[];
  topReferrers: ReferrerCount[];
}

export async function getAnalyticsForUser(userId: string): Promise<AnalyticsData> {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceDate = thirtyDaysAgo.toISOString();

  const { count: totalViews } = await supabase
    .from("board_views")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId);

  const { data: recentViews } = await supabase
    .from("board_views")
    .select("viewed_at")
    .eq("profile_id", userId)
    .gte("viewed_at", sinceDate)
    .order("viewed_at", { ascending: true });

  const viewsByDate = new Map<string, number>();

  for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split("T")[0];
    if (key) {
      viewsByDate.set(key, 0);
    }
  }

  for (const view of recentViews ?? []) {
    const dateKey = new Date(view.viewed_at).toISOString().split("T")[0];
    if (dateKey) {
      viewsByDate.set(dateKey, (viewsByDate.get(dateKey) ?? 0) + 1);
    }
  }

  const viewsOverTime: DailyViewCount[] = Array.from(viewsByDate.entries()).map(
    ([date, views]) => ({ date, views }),
  );

  const { data: referrerData } = await supabase
    .from("board_views")
    .select("referrer")
    .eq("profile_id", userId)
    .not("referrer", "is", null);

  const referrerCounts = new Map<string, number>();
  for (const row of referrerData ?? []) {
    if (row.referrer) {
      let domain: string;
      try {
        domain = new URL(row.referrer).hostname;
      } catch {
        domain = row.referrer;
      }
      referrerCounts.set(domain, (referrerCounts.get(domain) ?? 0) + 1);
    }
  }

  const topReferrers: ReferrerCount[] = Array.from(referrerCounts.entries())
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalViews: totalViews ?? 0,
    viewsOverTime,
    topReferrers,
  };
}
