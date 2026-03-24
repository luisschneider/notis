import Parser from "rss-parser";
import type { WidgetInstanceRow } from "@/lib/supabase/types";
import { listWidgetInstancesByUserId, updateWidgetInstanceById } from "@/lib/server/widgets";

export interface SubstackPost {
  title: string;
  url: string;
  publishedAt: string;
  excerpt: string;
}

const parser = new Parser();

function toSubstackFeedUrl(publication: string): string {
  const normalized = publication.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!normalized) {
    throw new Error("Substack publication is required.");
  }
  return `https://${normalized}.substack.com/feed`;
}

export async function fetchSubstackPosts(
  publication: string,
  maxItems: number,
): Promise<SubstackPost[]> {
  const feedUrl = toSubstackFeedUrl(publication);
  const feed = await parser.parseURL(feedUrl);
  const entries = feed.items ?? [];
  return entries.slice(0, Math.max(1, Math.min(10, maxItems))).map((item) => ({
    title: item.title ?? "Untitled post",
    url: item.link ?? "",
    publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
    excerpt: item.contentSnippet ?? "",
  }));
}

function getConfigString(config: Record<string, unknown>, key: string): string {
  return typeof config[key] === "string" ? config[key] : "";
}

function getConfigNumber(config: Record<string, unknown>, key: string, fallback: number): number {
  return typeof config[key] === "number" ? config[key] : fallback;
}

async function syncSubstackWidget(widget: WidgetInstanceRow): Promise<WidgetInstanceRow> {
  const publication = getConfigString(widget.config, "publication");
  const maxItems = Math.max(1, Math.min(10, getConfigNumber(widget.config, "maxItems", 3)));
  const posts = publication ? await fetchSubstackPosts(publication, maxItems) : [];

  if (widget.widget_type === "substack_featured_post") {
    const featuredUrl = getConfigString(widget.config, "featuredUrl");
    const featured = posts.find((post) => post.url === featuredUrl) ?? posts[0] ?? null;
    return updateWidgetInstanceById(widget.user_id, widget.id, {
      data: {
        post: featured,
      },
    });
  }

  return updateWidgetInstanceById(widget.user_id, widget.id, {
    data: {
      posts,
      items: posts,
    },
  });
}

export async function syncSubstackWidgetById(
  userId: string,
  widget: WidgetInstanceRow,
): Promise<WidgetInstanceRow> {
  if (widget.user_id !== userId) {
    throw new Error("Widget does not belong to current user.");
  }
  if (
    widget.widget_type !== "substack_latest_posts" &&
    widget.widget_type !== "substack_featured_post"
  ) {
    throw new Error("Widget is not a Substack widget.");
  }
  return syncSubstackWidget(widget);
}

export async function syncSubstackWidgetsForUser(
  userId: string,
  widgetId?: string,
): Promise<{ updated: number; widget: WidgetInstanceRow | null }> {
  const widgets = await listWidgetInstancesByUserId(userId);
  const targetWidgets = widgets.filter(
    (widget) =>
      (widget.widget_type === "substack_latest_posts" ||
        widget.widget_type === "substack_featured_post") &&
      (!widgetId || widget.id === widgetId),
  );

  let lastUpdatedWidget: WidgetInstanceRow | null = null;
  for (const widget of targetWidgets) {
    lastUpdatedWidget = await syncSubstackWidget(widget);
  }

  return {
    updated: targetWidgets.length,
    widget: lastUpdatedWidget,
  };
}
