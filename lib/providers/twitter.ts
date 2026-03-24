import type { WidgetInstanceRow } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";

export interface TwitterEmbedItem {
  url: string;
}

function parseTweetUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function buildTwitterRecentTweetsData(
  widget: WidgetInstanceRecord,
): { tweetUrls: string[] } {
  const tweetUrls = parseTweetUrls(widget.data.tweetUrls);
  return {
    tweetUrls,
  };
}

export function buildTwitterPinnedTweetData(
  widget: WidgetInstanceRecord,
): { tweetUrl: string | null } {
  const tweetUrl =
    typeof widget.data.tweetUrl === "string" && widget.data.tweetUrl.trim().length > 0
      ? widget.data.tweetUrl.trim()
      : null;
  return {
    tweetUrl,
  };
}

interface TwitterOEmbedResponse {
  html?: string;
}

export async function fetchTwitterOEmbedHtml(tweetUrl: string): Promise<string | null> {
  const endpoint = `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(
    tweetUrl,
  )}`;
  const response = await fetch(endpoint, { next: { revalidate: 0 } });
  if (!response.ok) {
    return null;
  }
  const json = (await response.json()) as TwitterOEmbedResponse;
  return typeof json.html === "string" ? json.html : null;
}

function parseWidgetRows(
  rows: Array<{
    id: string;
    widget_type: string;
    data: Record<string, unknown>;
    config: Record<string, unknown>;
  }>,
): WidgetInstanceRow[] {
  return rows as WidgetInstanceRow[];
}

export async function syncTwitterWidgets(
  userId: string,
  widgetInstanceId?: string,
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("widget_instances")
    .select("id, widget_type, data, config")
    .eq("user_id", userId)
    .in("widget_type", ["twitter_recent_tweets", "twitter_pinned_tweet"]);

  if (widgetInstanceId) {
    query = query.eq("id", widgetInstanceId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch Twitter widgets: ${error.message}`);
  }

  const widgets = parseWidgetRows(data ?? []);
  let synced = 0;

  for (const widget of widgets) {
    if (widget.widget_type === "twitter_recent_tweets") {
      const tweetUrls = parseTweetUrls(widget.data.tweetUrls);
      const embedded = await Promise.all(
        tweetUrls.slice(0, 5).map(async (url) => ({
          url,
          html: await fetchTwitterOEmbedHtml(url),
        })),
      );
      const { error: updateError } = await supabase
        .from("widget_instances")
        .update({
          data: {
            ...widget.data,
            tweets: embedded,
            tweetUrls,
          },
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", widget.id)
        .eq("user_id", userId);
      if (updateError) {
        throw new Error(`Failed to update Twitter widget ${widget.id}: ${updateError.message}`);
      }
      synced += 1;
      continue;
    }

    const pinnedUrl =
      typeof widget.config.pinnedTweetUrl === "string" ? widget.config.pinnedTweetUrl : null;
    const html = pinnedUrl ? await fetchTwitterOEmbedHtml(pinnedUrl) : null;
    const { error: updateError } = await supabase
      .from("widget_instances")
      .update({
        data: {
          ...widget.data,
          tweetUrl: pinnedUrl,
          html,
        },
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", widget.id)
      .eq("user_id", userId);
    if (updateError) {
      throw new Error(`Failed to update Twitter widget ${widget.id}: ${updateError.message}`);
    }
    synced += 1;
  }

  return synced;
}
