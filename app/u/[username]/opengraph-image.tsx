import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { WIDGET_REGISTRY_MAP } from "@/lib/widgets/registry";
import { isWidgetType, type WidgetType } from "@/lib/widgets/types";

export const runtime = "edge";
export const alt = "Public Notis board preview";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

interface PublicProfileForOg {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface WidgetHintRow {
  id: string;
  widget_type: WidgetType;
}

function getDisplayName(profile: PublicProfileForOg): string {
  return profile.display_name || profile.username;
}

function getInitials(value: string): string {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "N";
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

async function getPublicBoardForOg(
  username: string,
): Promise<{ profile: PublicProfileForOg | null; widgets: WidgetHintRow[] }> {
  const supabase = await createClient();
  const normalizedUsername = username.toLowerCase();

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (profileError || !profileData) {
    return { profile: null, widgets: [] };
  }

  const profile = profileData as PublicProfileForOg;
  const { data: widgetData, error: widgetError } = await supabase
    .from("widget_instances")
    .select("id, widget_type")
    .eq("user_id", profile.id)
    .eq("is_visible", true)
    .order("position", { ascending: true })
    .limit(6);

  if (widgetError || !widgetData) {
    return { profile, widgets: [] };
  }

  const widgets = widgetData
    .filter((widget): widget is { id: string; widget_type: WidgetType } =>
      isWidgetType(widget.widget_type),
    )
    .map((widget) => ({ id: widget.id, widget_type: widget.widget_type }));

  return { profile, widgets };
}

function buildFallbackImage(username: string): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, rgb(9, 9, 11) 0%, rgb(24, 24, 27) 45%, rgb(39, 39, 42) 100%)",
          color: "white",
          padding: "56px",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 700 }}>Notis</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 58, fontWeight: 700, letterSpacing: -1.5 }}>@{username}</div>
          <div style={{ fontSize: 28, opacity: 0.9 }}>Personal digital notice board</div>
        </div>
      </div>
    ),
    size,
  );
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<ImageResponse> {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();
  const { profile, widgets } = await getPublicBoardForOg(username);

  if (!profile) {
    return buildFallbackImage(username);
  }

  const displayName = getDisplayName(profile);
  const bio = profile.bio ? truncate(profile.bio, 140) : "No bio yet.";
  const widgetNames = widgets.map((widget) => WIDGET_REGISTRY_MAP[widget.widget_type].displayName);
  const remainingWidgets = Math.max(0, widgetNames.length - 4);
  const visibleWidgetNames = widgetNames.slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at top right, rgb(37, 99, 235) 0%, rgba(37, 99, 235, 0) 40%), linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)",
          color: "white",
          padding: "52px",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  fontSize: 58,
                  fontWeight: 800,
                  letterSpacing: -1.4,
                  lineHeight: 1,
                }}
              >
                {truncate(displayName, 30)}
              </div>
              <div
                style={{
                  borderRadius: 999,
                  padding: "6px 14px",
                  fontSize: 24,
                  backgroundColor: "rgba(148, 163, 184, 0.2)",
                  border: "1px solid rgba(148, 163, 184, 0.5)",
                }}
              >
                @{profile.username}
              </div>
            </div>
            <div style={{ fontSize: 30, lineHeight: 1.35, color: "rgb(226, 232, 240)" }}>{bio}</div>
          </div>
          <div
            style={{
              width: 156,
              height: 156,
              borderRadius: 9999,
              overflow: "hidden",
              border: "4px solid rgba(148, 163, 184, 0.6)",
              backgroundColor: "rgba(30, 41, 59, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={`${displayName} avatar`}
                width={156}
                height={156}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            ) : (
              getInitials(displayName)
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 24, color: "rgb(191, 219, 254)", fontWeight: 600 }}>
            Widget highlights
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {visibleWidgetNames.length > 0 ? (
              visibleWidgetNames.map((name) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 14,
                    border: "1px solid rgba(96, 165, 250, 0.5)",
                    backgroundColor: "rgba(37, 99, 235, 0.2)",
                    padding: "12px 16px",
                    fontSize: 22,
                    color: "rgb(219, 234, 254)",
                  }}
                >
                  {name}
                </div>
              ))
            ) : (
              <div
                style={{
                  display: "flex",
                  borderRadius: 14,
                  border: "1px solid rgba(148, 163, 184, 0.5)",
                  backgroundColor: "rgba(51, 65, 85, 0.45)",
                  padding: "12px 16px",
                  fontSize: 22,
                  color: "rgb(226, 232, 240)",
                }}
              >
                No widgets published yet
              </div>
            )}
            {remainingWidgets > 0 ? (
              <div
                style={{
                  display: "flex",
                  borderRadius: 14,
                  border: "1px solid rgba(148, 163, 184, 0.5)",
                  backgroundColor: "rgba(51, 65, 85, 0.45)",
                  padding: "12px 16px",
                  fontSize: 22,
                  color: "rgb(226, 232, 240)",
                }}
              >
                +{remainingWidgets} more
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "rgb(148, 163, 184)",
          }}
        >
          <div>notis.app</div>
          <div>Personal digital notice board</div>
        </div>
      </div>
    ),
    size,
  );
}
