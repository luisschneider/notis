import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncTwitterWidgetsForUser } from "@/lib/providers/twitter";

interface SyncResponse {
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
    const targetWidgetId =
      typeof raw.widgetId === "string" && raw.widgetId.length > 0 ? raw.widgetId : undefined;
    const synced = await syncTwitterWidgetsForUser(user.id, targetWidgetId);
    return NextResponse.json({ synced }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync Twitter widgets." },
      { status: 400 },
    );
  }
}
