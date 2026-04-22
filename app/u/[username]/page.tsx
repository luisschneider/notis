import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WidgetRenderer } from "@/components/widgets/render-widget";
import { LazyWidget } from "@/components/widgets/lazy-widget";
import { WIDGET_REGISTRY_MAP } from "@/lib/widgets/registry";
import { isWidgetType, type WidgetInstanceRecord } from "@/lib/widgets/types";
import { TrackView } from "@/components/analytics/track-view";
import { JsonLd } from "@/components/seo/json-ld";
import Image from "next/image";
import Link from "next/link";
import { generatePublicProfileMetadata } from "./metadata";

export const revalidate = 60;

interface PublicProfileRecord {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || "N";
}

export default async function PublicBoardPage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<React.JSX.Element> {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  const typedProfile = profile as PublicProfileRecord;
  const { data: widgets, error: widgetsError } = await supabase
    .from("widget_instances")
    .select("id, user_id, widget_type, position, config, data, is_visible, last_synced_at, created_at, updated_at")
    .eq("user_id", typedProfile.id)
    .eq("is_visible", true)
    .order("position", { ascending: true });

  if (widgetsError) {
    notFound();
  }

  const validWidgets = (widgets ?? []).filter((widget) => isWidgetType(widget.widget_type));
  const typedWidgets = validWidgets as WidgetInstanceRecord[];
  const displayName = typedProfile.display_name || typedProfile.username;

  const siteUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const personJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    url: `${siteUrl}/u/${typedProfile.username}`,
    description: typedProfile.bio || `${displayName}'s Notis board.`,
    ...(typedProfile.avatar_url ? { image: typedProfile.avatar_url } : {}),
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10">
      <JsonLd data={personJsonLd} />
      <header className="mb-8 flex flex-col items-center gap-4 text-center md:items-start md:text-left">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-muted">
          {typedProfile.avatar_url ? (
            <Image
              src={typedProfile.avatar_url}
              alt={`${displayName} avatar`}
              width={80}
              height={80}
              className="size-full object-cover"
              priority
            />
          ) : (
            <span className="flex size-full items-center justify-center text-lg font-medium text-muted-foreground">
              {getInitials(displayName)}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">@{typedProfile.username}</p>
          {typedProfile.bio ? <p className="max-w-2xl text-sm">{typedProfile.bio}</p> : null}
        </div>
      </header>

      <section className="space-y-4 md:hidden">
        {typedWidgets.map((widget, index) =>
          index < 2 ? (
            <WidgetRenderer key={widget.id} widget={widget} />
          ) : (
            <LazyWidget key={widget.id}>
              <WidgetRenderer widget={widget} />
            </LazyWidget>
          ),
        )}
      </section>

      <section className="hidden grid-cols-2 gap-4 md:grid md:auto-rows-[minmax(140px,auto)] md:grid-flow-dense">
        {typedWidgets.map((widget, index) => {
          const widgetMeta = WIDGET_REGISTRY_MAP[widget.widget_type];
          const gridClass = `col-span-${widgetMeta.gridWidth} row-span-${widgetMeta.gridHeight}`;
          return index < 3 ? (
            <div key={widget.id} className={gridClass}>
              <WidgetRenderer widget={widget} />
            </div>
          ) : (
            <LazyWidget key={widget.id} className={gridClass}>
              <WidgetRenderer widget={widget} />
            </LazyWidget>
          );
        })}
      </section>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        <Link href="/" className="underline underline-offset-4">
          Made with Notis
        </Link>
      </footer>

      <TrackView username={typedProfile.username} />
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return generatePublicProfileMetadata(username);
}
