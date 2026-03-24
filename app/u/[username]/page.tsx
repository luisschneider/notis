import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WidgetRenderer } from "@/components/widgets/render-widget";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WIDGET_REGISTRY_MAP } from "@/lib/widgets/registry";
import { isWidgetType, type WidgetInstanceRecord } from "@/lib/widgets/types";
import Link from "next/link";
import { generatePublicProfileMetadata } from "./metadata";

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

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-col items-center gap-4 text-center md:items-start md:text-left">
        <Avatar className="size-20">
          <AvatarImage src={typedProfile.avatar_url ?? undefined} alt={`${displayName} avatar`} />
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">@{typedProfile.username}</p>
          {typedProfile.bio ? <p className="max-w-2xl text-sm">{typedProfile.bio}</p> : null}
        </div>
      </header>

      <section className="space-y-4 md:hidden">
        {typedWidgets.map((widget) => (
          <WidgetRenderer key={widget.id} widget={widget} />
        ))}
      </section>

      <section className="hidden grid-cols-2 gap-4 md:grid md:auto-rows-[minmax(140px,auto)] md:grid-flow-dense">
        {typedWidgets.map((widget) => {
          const widgetMeta = WIDGET_REGISTRY_MAP[widget.widget_type];
          return (
            <div
              key={widget.id}
              className={`col-span-${widgetMeta.gridWidth} row-span-${widgetMeta.gridHeight}`}
            >
              <WidgetRenderer widget={widget} />
            </div>
          );
        })}
      </section>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        <Link href="/" className="underline underline-offset-4">
          Made with Notis
        </Link>
      </footer>
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
