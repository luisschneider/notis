"use server";

import { requireAdmin } from "@/lib/server/admin-auth";
import { getSignupsOverTime, getBoardViewsOverTime } from "@/lib/server/admin-data";
import type { DailyCount } from "@/lib/server/admin-data";

interface TimeSeriesResult {
  signups: DailyCount[];
  boardViews: DailyCount[];
}

export async function fetchTimeSeriesData(
  fromISO: string,
  toISO: string,
): Promise<TimeSeriesResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    throw new Error("Unauthorized");
  }

  const from = new Date(fromISO);
  const to = new Date(toISO);

  const [signups, boardViews] = await Promise.all([
    getSignupsOverTime(from, to),
    getBoardViewsOverTime(from, to),
  ]);

  return { signups, boardViews };
}
