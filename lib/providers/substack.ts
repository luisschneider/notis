import Parser from "rss-parser";
import type { WidgetInstanceRow } from "@/lib/supabase/types";
import { listWidgetInstancesByUserId, updateWidgetInstanceById } from "@/lib/server/widgets";
import { listWidgetInstancesByUserId, updateWidgetInstanceById } from "@/lib/server/widgets";
import type { WidgetInstanceRow } from "@/lib/supabase/types";

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

function readPublication(widget: WidgetInstanceRow): string {
  const publication = widget.config.publication;
  if (typeof publication !== "string") {
    return "";
  }
  return publication.trim();
}

function readMaxItems(widget: WidgetInstanceRow): number {
  const maxItems = widget.config.maxItems;
  if (typeof maxItems !== "number") {
    return 3;
  }
  return Math.max(1, Math.min(10, Math.floor(maxItems)));
}

export async function syncSubstackWidgetsForUser(userId: string): Promise<number> {
  const widgets = await listWidgetInstancesByUserId(userId);
  const substackWidgets = widgets.filter(
    (widget) =>
      widget.widget_type === "substack_latest_posts" ||
      widget.widget_type === "substack_featured_post",
  );

  let updatedCount = 0;
  for (const widget of substackWidgets) {
    const publication = readPublication(widget);
    if (!publication) {
      continue;
    }

    const posts = await fetchSubstackPosts(publication, readMaxItems(widget));
    if (widget.widget_type === "substack_featured_post") {
      await updateWidgetInstanceById(userId, widget.id, {
        data: {
          post: posts[0] ?? null,
        },
      });
      updatedCount += 1;
      continue;
    }

    await updateWidgetInstanceById(userId, widget.id, {
      data: {
        items: posts,
      },
    });
    updatedCount += 1;
  }

  return updatedCount;
}
