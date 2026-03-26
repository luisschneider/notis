import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { WidgetRenderer } from "@/components/widgets/render-widget";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { WIDGET_REGISTRY_MAP } from "@/lib/widgets/registry";
import type { WidgetInstanceRecord, WidgetType } from "@/lib/widgets/types";

export const metadata: Metadata = {
  title: "Notis — Your personal board on the web",
  description:
    "Create one beautiful page that shows what you are reading, building, listening to, and thinking about.",
};

const NOW_ISO = "2026-03-26T11:30:00.000Z";
const DEMO_USER_ID = "demo-user-id";

const DEMO_WIDGETS: WidgetInstanceRecord[] = [
  {
    id: "widget-custom-text-bio",
    user_id: DEMO_USER_ID,
    widget_type: "custom_text_bio",
    position: 0,
    config: { title: "About" },
    data: {
      markdown:
        "I design calm developer tools and write tiny essays about focus, software, and city walks.\n\nCurrently in Kyoto building **Notis demos** and collecting coffee shop playlists.",
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-custom-text-links",
    user_id: DEMO_USER_ID,
    widget_type: "custom_text_links",
    position: 1,
    config: { title: "Quick Links" },
    data: {
      links: [
        { label: "Portfolio", url: "https://example.com/portfolio" },
        { label: "Newsletter", url: "https://example.com/newsletter" },
        { label: "Uses", url: "https://example.com/uses" },
        { label: "Book notes", url: "https://example.com/books" },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-custom-text-quote",
    user_id: DEMO_USER_ID,
    widget_type: "custom_text_quote",
    position: 2,
    config: { title: "Motto" },
    data: {
      quote: "Build software that leaves people calmer than before.",
      attribution: "Personal note",
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-location-current",
    user_id: DEMO_USER_ID,
    widget_type: "location_current",
    position: 3,
    config: { title: "Location", location: "Kyoto, Japan", country_code: "jp" },
    data: { location: "Kyoto, Japan", countryCode: "JP" },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-location-map",
    user_id: DEMO_USER_ID,
    widget_type: "location_map",
    position: 4,
    config: { title: "Map", location: "Kyoto, Japan", country_code: "jp" },
    data: { location: "Kyoto, Japan", latitude: 35.0116, longitude: 135.7681 },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-reading-list-items",
    user_id: DEMO_USER_ID,
    widget_type: "reading_list_items",
    position: 5,
    config: { title: "Reading List", maxItems: 5 },
    data: {
      items: [
        {
          id: "reading-1",
          title: "Designing Better Feedback Loops",
          url: "https://example.com/feedback-loops",
          author: "Maya Chen",
          item_type: "article",
        },
        {
          id: "reading-2",
          title: "Build",
          url: "https://example.com/build",
          author: "Tony Fadell",
          item_type: "book",
        },
        {
          id: "reading-3",
          title: "Syntax Episode 822",
          url: "https://example.com/podcast",
          author: "Wes Bos & Scott Tolinski",
          item_type: "podcast",
        },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-reading-list-currently-reading",
    user_id: DEMO_USER_ID,
    widget_type: "reading_list_currently_reading",
    position: 6,
    config: { title: "Currently Reading", maxItems: 2 },
    data: {
      items: [
        {
          id: "current-reading-1",
          title: "Tiny Habits for Builders",
          url: "https://example.com/tiny-habits",
          author: "Nora Patel",
          item_type: "book",
        },
        {
          id: "current-reading-2",
          title: "The Shape of Product Taste",
          url: "https://example.com/product-taste",
          author: "Jules Rivera",
          item_type: "article",
        },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-substack-latest-posts",
    user_id: DEMO_USER_ID,
    widget_type: "substack_latest_posts",
    position: 7,
    config: { title: "Latest from Slow Shipping", publication: "slowshipping", maxItems: 3 },
    data: {
      posts: [
        {
          title: "How I Plan a Focus Week",
          url: "https://slowshipping.substack.com/p/focus-week",
          publishedAt: "2026-03-20T09:00:00.000Z",
        },
        {
          title: "A Better Weekly Review Template",
          url: "https://slowshipping.substack.com/p/weekly-review",
          publishedAt: "2026-03-12T09:00:00.000Z",
        },
        {
          title: "Shipping Without Burnout",
          url: "https://slowshipping.substack.com/p/no-burnout",
          publishedAt: "2026-03-05T09:00:00.000Z",
        },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-substack-featured-post",
    user_id: DEMO_USER_ID,
    widget_type: "substack_featured_post",
    position: 8,
    config: { title: "Featured Post", publication: "slowshipping" },
    data: {
      post: {
        title: "The Personal Homepage Is Back",
        url: "https://slowshipping.substack.com/p/personal-homepage",
        excerpt:
          "People want context, not follower counts. Here is a framework for writing a page that feels like you.",
      },
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-github-recent-activity",
    user_id: DEMO_USER_ID,
    widget_type: "github_recent_activity",
    position: 9,
    config: { title: "GitHub Activity", username: "avawritescode", maxItems: 5 },
    data: {
      events: [
        {
          repo: "ava/notis-ui",
          createdAt: "2026-03-25T20:00:00.000Z",
          summary: "Pushed 4 commits to improve mobile typography",
        },
        {
          repo: "ava/notis-api",
          createdAt: "2026-03-24T18:00:00.000Z",
          summary: "Opened PR: Add resilient widget sync retries",
        },
        {
          repo: "ava/weekly-notes",
          createdAt: "2026-03-23T16:00:00.000Z",
          summary: "Published release v0.8.1",
        },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-github-pinned-repos",
    user_id: DEMO_USER_ID,
    widget_type: "github_pinned_repos",
    position: 10,
    config: { title: "Pinned Repos", username: "avawritescode", maxItems: 4 },
    data: {
      repos: [
        {
          id: 1001,
          name: "notis-app",
          html_url: "https://github.com/example/notis-app",
          description: "Personal digital notice board built with Next.js + Supabase.",
          stargazers_count: 412,
          language: "TypeScript",
        },
        {
          id: 1002,
          name: "bento-patterns",
          html_url: "https://github.com/example/bento-patterns",
          description: "Reusable responsive bento layouts and card primitives.",
          stargazers_count: 186,
          language: "CSS",
        },
        {
          id: 1003,
          name: "quiet-components",
          html_url: "https://github.com/example/quiet-components",
          description: "Low-noise UI components for profile-centric apps.",
          stargazers_count: 95,
          language: "TypeScript",
        },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-github-contribution-graph",
    user_id: DEMO_USER_ID,
    widget_type: "github_contribution_graph",
    position: 11,
    config: { title: "Contributions", username: "avawritescode" },
    data: {
      days: [
        { date: "2026-02-20", count: 2 },
        { date: "2026-02-21", count: 0 },
        { date: "2026-02-22", count: 1 },
        { date: "2026-02-23", count: 5 },
        { date: "2026-02-24", count: 8 },
        { date: "2026-02-25", count: 3 },
        { date: "2026-02-26", count: 0 },
        { date: "2026-02-27", count: 7 },
        { date: "2026-02-28", count: 9 },
        { date: "2026-03-01", count: 3 },
        { date: "2026-03-02", count: 4 },
        { date: "2026-03-03", count: 5 },
        { date: "2026-03-04", count: 1 },
        { date: "2026-03-05", count: 0 },
        { date: "2026-03-06", count: 2 },
        { date: "2026-03-07", count: 6 },
        { date: "2026-03-08", count: 4 },
        { date: "2026-03-09", count: 1 },
        { date: "2026-03-10", count: 0 },
        { date: "2026-03-11", count: 3 },
        { date: "2026-03-12", count: 8 },
        { date: "2026-03-13", count: 4 },
        { date: "2026-03-14", count: 2 },
        { date: "2026-03-15", count: 1 },
        { date: "2026-03-16", count: 0 },
        { date: "2026-03-17", count: 5 },
        { date: "2026-03-18", count: 9 },
        { date: "2026-03-19", count: 7 },
        { date: "2026-03-20", count: 6 },
        { date: "2026-03-21", count: 3 },
        { date: "2026-03-22", count: 1 },
        { date: "2026-03-23", count: 0 },
        { date: "2026-03-24", count: 4 },
        { date: "2026-03-25", count: 8 },
        { date: "2026-03-26", count: 5 },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-spotify-recent-tracks",
    user_id: DEMO_USER_ID,
    widget_type: "spotify_recent_tracks",
    position: 12,
    config: { title: "Recent Tracks", maxItems: 5 },
    data: {
      tracks: [
        { id: "track-1", title: "Good Days", artist: "SZA" },
        { id: "track-2", title: "Innerbloom", artist: "RUFUS DU SOL" },
        { id: "track-3", title: "Get Sun", artist: "Hiatus Kaiyote" },
        { id: "track-4", title: "Nights", artist: "Frank Ocean" },
        { id: "track-5", title: "Only If", artist: "Steve Lacy" },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-spotify-top-artists",
    user_id: DEMO_USER_ID,
    widget_type: "spotify_top_artists",
    position: 13,
    config: { title: "Top Artists", maxItems: 5, range: "medium_term" },
    data: {
      artists: [
        { id: "artist-1", name: "Bonobo" },
        { id: "artist-2", name: "Khruangbin" },
        { id: "artist-3", name: "Little Simz" },
        { id: "artist-4", name: "Fred again.." },
        { id: "artist-5", name: "Jungle" },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-spotify-top-tracks",
    user_id: DEMO_USER_ID,
    widget_type: "spotify_top_tracks",
    position: 14,
    config: { title: "Top Tracks", maxItems: 5, range: "short_term" },
    data: {
      tracks: [
        { id: "top-track-1", title: "Breathe", artist: "Telepopmusik" },
        { id: "top-track-2", title: "Solar Power", artist: "Lorde" },
        { id: "top-track-3", title: "Glue", artist: "Bicep" },
        { id: "top-track-4", title: "N95", artist: "Kendrick Lamar" },
        { id: "top-track-5", title: "Virgo's Groove", artist: "Beyonce" },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-spotify-now-playing",
    user_id: DEMO_USER_ID,
    widget_type: "spotify_now_playing",
    position: 15,
    config: { title: "Now Playing" },
    data: {
      isPlaying: true,
      title: "Love Is Everywhere",
      artist: "Pharoah Sanders",
      albumArtUrl: "/next.svg",
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-twitter-recent-tweets",
    user_id: DEMO_USER_ID,
    widget_type: "twitter_recent_tweets",
    position: 16,
    config: { title: "Recent Tweets", maxItems: 3 },
    data: {
      tweets: [
        {
          url: "https://x.com/avawritescode/status/19020911220001",
          text: "Launched a cleaner mobile widget stack for Notis today. Tiny details matter.",
          authorHandle: "avawritescode",
        },
        {
          url: "https://x.com/avawritescode/status/19019908770002",
          text: "Reading list widgets are underrated profile real estate.",
          authorHandle: "avawritescode",
        },
        {
          url: "https://x.com/avawritescode/status/19018765430003",
          text: "Personal pages should feel like people, not funnels.",
          authorHandle: "avawritescode",
        },
      ],
    },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: "widget-twitter-pinned-tweet",
    user_id: DEMO_USER_ID,
    widget_type: "twitter_pinned_tweet",
    position: 17,
    config: { title: "Pinned Tweet" },
    data: { pinnedUrl: "https://x.com/avawritescode/status/19015550100004" },
    is_visible: true,
    last_synced_at: NOW_ISO,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
].sort((left, right) => left.position - right.position);

function getGridSpanClassName(widgetType: WidgetType): string {
  const widgetMeta = WIDGET_REGISTRY_MAP[widgetType];
  const columnClass = widgetMeta.gridWidth === 2 ? "md:col-span-2" : "md:col-span-1";
  const rowClass = widgetMeta.gridHeight === 2 ? "md:row-span-2" : "md:row-span-1";
  return `${columnClass} ${rowClass}`;
}

function DemoBoard(): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xl shadow-black/5">
      <div className="border-b bg-muted/40 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 border">
            <AvatarImage src="https://api.dicebear.com/9.x/lorelei/svg?seed=Ava%20Park" alt="Ava Park avatar" />
            <AvatarFallback>AP</AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold sm:text-base">Ava Park</p>
            <p className="text-xs text-muted-foreground sm:text-sm">@avapark</p>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Product engineer sharing what I am building, reading, and listening to this week.
        </p>
      </div>
      <div className="p-4 sm:p-5">
        <div className="space-y-4 md:hidden">
          {DEMO_WIDGETS.map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}
        </div>
        <div className="hidden grid-cols-2 gap-4 md:grid md:auto-rows-[minmax(140px,auto)] md:grid-flow-dense">
          {DEMO_WIDGETS.map((widget) => (
            <div key={widget.id} className={getGridSpanClassName(widget.widget_type)}>
              <WidgetRenderer widget={widget} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function Home(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,theme(colors.violet.200/.45),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,theme(colors.violet.900/.35),transparent_58%)]"
      />
      <header className="border-b border-border/80 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
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
                <Button asChild size="sm" variant="ghost">
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

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-12 sm:pb-14 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" />
            Personal digital notice board
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Show your internet life in one calm, beautiful page.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            Notis is like a modern profile home: part Linktree simplicity, part bento layout, part
            thoughtful personal portfolio. Share what you are reading, listening to, and building.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
            <Button asChild size="lg" className="h-11">
              <Link href={user ? "/dashboard/widgets" : "/signup"}>
                Start your Notis board
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11">
              <Link href="/u/demo">View a live profile</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Mobile-first
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Bento board layout
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              18 widget types
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:pb-20">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Live demo board
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Exactly what your board can look like.
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            This fictional profile includes every widget type from the Notis registry, each filled
            with realistic mock content so visitors can understand the full product in one scroll.
          </p>
        </div>
        <DemoBoard />
      </section>

      <section className="border-y border-border/70 bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-12 text-center sm:py-14">
          <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to publish your own Notis page?
          </h3>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            Create your account, pick widgets, and go live in minutes. Keep it updated as your week
            changes.
          </p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild size="lg" className="h-11">
              <Link href={user ? "/dashboard/widgets" : "/signup"}>Create your board</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
          <p
            className={cn(
              "text-xs text-muted-foreground",
              "mx-auto max-w-xl text-balance",
            )}
          >
            No coding required. Add widgets, reorder your layout, and share your `notis.app/u/username`.
          </p>
        </div>
      </section>

      <footer className="py-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground">
          <p>Made with Notis</p>
          <Link href={user ? "/dashboard/widgets" : "/signup"} className="underline underline-offset-4">
            Start free
          </Link>
        </div>
      </footer>
    </main>
  );
}
