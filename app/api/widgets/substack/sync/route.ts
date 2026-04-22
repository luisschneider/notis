import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncSubstackWidgetsForUser } from "@/lib/providers/substack";
import { revalidatePath } from "next/cache";

interface SyncResponse {
  updated?: number;
  widget?: {
    id: string;
    user_id: string;
    widget_type: string;
    position: number;
    config: Record<string, unknown>;
    data: Record<string, unknown>;
    is_visible: boolean;
    last_synced_at: string | null;
    created_at: string;
    updated_at: string;
  };
  synced?: number;
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<SyncResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const raw = (await request.json()) as { widgetId?: string };
    const widgetId =
      typeof raw.widgetId === "string" && raw.widgetId.length > 0 ? raw.widgetId : undefined;
    const synced = await syncSubstackWidgetsForUser(user.id, widgetId);

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return NextResponse.json(
      {
        updated: synced.updated,
        widget: synced.widget ?? undefined,
        synced: synced.updated,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync Substack widgets." },
      { status: 400 },
    );
  }
}
