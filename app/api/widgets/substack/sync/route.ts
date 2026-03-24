import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncSubstackWidget } from "@/lib/providers/substack";
import { getWidgetInstanceById } from "@/lib/server/widgets";

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
  error?: string;
}

const bodySchema = z
  .object({
    widgetId: z.string().uuid().optional(),
  })
  .strict();

export async function POST(request: Request): Promise<NextResponse<SyncResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse((await request.json()) as unknown);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!payload.widgetId) {
    return NextResponse.json(
      { error: "widgetId is required for Substack sync." },
      { status: 400 },
    );
  }

  const widget = await getWidgetInstanceById(user.id, payload.widgetId);
  if (!widget) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }

  try {
    const updatedWidget = await syncSubstackWidget(user.id, widget);
    return NextResponse.json({ updated: 1, widget: updatedWidget }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync Substack widget." },
      { status: 400 },
    );
  }
}
