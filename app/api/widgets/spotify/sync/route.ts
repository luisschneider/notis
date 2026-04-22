import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncSpotifyWidgetById, syncSpotifyWidgetsForUser } from "@/lib/providers/spotify";
import { revalidatePath } from "next/cache";

interface SpotifySyncRequestBody {
  widgetId?: string;
}

interface SpotifySyncResponse {
  updated?: number;
  synced?: number;
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<SpotifySyncResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SpotifySyncRequestBody;
    const synced = body.widgetId
      ? await syncSpotifyWidgetById(user.id, body.widgetId)
      : await syncSpotifyWidgetsForUser(user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return NextResponse.json({ synced, updated: synced }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Spotify sync failed." },
      { status: 400 },
    );
  }
}
