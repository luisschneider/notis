import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminMetrics {
  totalUsers: number;
  totalBoardViews: number;
  totalWidgets: number;
  connectedAccountsByProvider: ProviderCount[];
}

export interface ProviderCount {
  provider: string;
  count: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface WidgetTypeCount {
  widget_type: string;
  count: number;
}

export interface RecentSignup {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  widget_count: number;
}

export interface TopBoard {
  username: string;
  total_views: number;
}

export interface MostActiveUser {
  username: string;
  display_name: string;
  widget_count: number;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const supabase = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalBoardViews },
    { count: totalWidgets },
    { data: providerData },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("board_views").select("*", { count: "exact", head: true }),
    supabase.from("widget_instances").select("*", { count: "exact", head: true }),
    supabase.from("connected_accounts").select("provider"),
  ]);

  const providerCounts = new Map<string, number>();
  for (const row of providerData ?? []) {
    providerCounts.set(row.provider, (providerCounts.get(row.provider) ?? 0) + 1);
  }

  const connectedAccountsByProvider: ProviderCount[] = Array.from(
    providerCounts.entries(),
  )
    .map(([provider, count]) => ({ provider, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalUsers: totalUsers ?? 0,
    totalBoardViews: totalBoardViews ?? 0,
    totalWidgets: totalWidgets ?? 0,
    connectedAccountsByProvider,
  };
}

export async function getSignupsOverTime(
  startDate: Date,
  endDate: Date,
): Promise<DailyCount[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .order("created_at", { ascending: true });

  const countsByDate = new Map<string, number>();
  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const key = d.toISOString().split("T")[0];
    if (key) countsByDate.set(key, 0);
  }

  for (const row of data ?? []) {
    const dateKey = new Date(row.created_at).toISOString().split("T")[0];
    if (dateKey) countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
  }

  return Array.from(countsByDate.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}

export async function getBoardViewsOverTime(
  startDate: Date,
  endDate: Date,
): Promise<DailyCount[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("board_views")
    .select("viewed_at")
    .gte("viewed_at", startDate.toISOString())
    .lte("viewed_at", endDate.toISOString())
    .order("viewed_at", { ascending: true });

  const countsByDate = new Map<string, number>();
  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const key = d.toISOString().split("T")[0];
    if (key) countsByDate.set(key, 0);
  }

  for (const row of data ?? []) {
    const dateKey = new Date(row.viewed_at).toISOString().split("T")[0];
    if (dateKey) countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
  }

  return Array.from(countsByDate.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}

export async function getWidgetPopularity(): Promise<WidgetTypeCount[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("widget_instances")
    .select("widget_type");

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.widget_type, (counts.get(row.widget_type) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([widget_type, count]) => ({ widget_type, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getRecentSignups(): Promise<RecentSignup[]> {
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!profiles?.length) return [];

  const userIds = profiles.map((p) => p.id);
  const { data: widgets } = await supabase
    .from("widget_instances")
    .select("user_id")
    .in("user_id", userIds);

  const widgetCounts = new Map<string, number>();
  for (const w of widgets ?? []) {
    widgetCounts.set(w.user_id, (widgetCounts.get(w.user_id) ?? 0) + 1);
  }

  return profiles.map((p) => ({
    id: p.id,
    username: p.username ?? "",
    display_name: p.display_name ?? "",
    created_at: p.created_at,
    widget_count: widgetCounts.get(p.id) ?? 0,
  }));
}

export async function getMostViewedBoards(): Promise<TopBoard[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("board_views")
    .select("profile_id, username_viewed");

  if (!data?.length) return [];

  const viewCounts = new Map<string, { username: string; count: number }>();
  for (const row of data) {
    const key = row.profile_id;
    const existing = viewCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      viewCounts.set(key, {
        username: row.username_viewed ?? "",
        count: 1,
      });
    }
  }

  return Array.from(viewCounts.values())
    .map((v) => ({ username: v.username, total_views: v.count }))
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, 20);
}

export async function getMostActiveUsers(): Promise<MostActiveUser[]> {
  const supabase = createAdminClient();

  const { data: widgets } = await supabase
    .from("widget_instances")
    .select("user_id");

  if (!widgets?.length) return [];

  const widgetCounts = new Map<string, number>();
  for (const w of widgets) {
    widgetCounts.set(w.user_id, (widgetCounts.get(w.user_id) ?? 0) + 1);
  }

  const topUserIds = Array.from(widgetCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", topUserIds);

  const profileMap = new Map<string, { username: string; display_name: string }>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, {
      username: p.username ?? "",
      display_name: p.display_name ?? "",
    });
  }

  return topUserIds.map((id) => {
    const profile = profileMap.get(id);
    return {
      username: profile?.username ?? "",
      display_name: profile?.display_name ?? "",
      widget_count: widgetCounts.get(id) ?? 0,
    };
  });
}
