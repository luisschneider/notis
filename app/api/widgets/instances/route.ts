import { createClient } from "@/lib/supabase/server";
import { createWidgetInstance } from "@/lib/server/widgets";
import { isWidgetType, type WidgetType } from "@/lib/widgets/types";
import { NextResponse } from "next/server";

interface CreateWidgetRequest {
  widget_type?: string;
}

interface WidgetInstanceApiRecord {
  id: string;
  user_id: string;
  widget_type: WidgetType;
  position: number;
  config: Record<string, unknown>;
  data: Record<string, unknown>;
  is_visible: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ListApiResponse {
  widgets?: WidgetInstanceApiRecord[];
  error?: string;
}

interface CreateApiResponse {
  widget?: WidgetInstanceApiRecord;
  error?: string;
}

export async function GET(): Promise<NextResponse<ListApiResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: widgets, error } = await supabase
    .from("widget_instances")
    .select(
      "id, user_id, widget_type, position, config, data, is_visible, last_synced_at, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ widgets: (widgets ?? []) as WidgetInstanceApiRecord[] }, { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse<CreateApiResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as CreateWidgetRequest;
  const widgetType = body.widget_type;

  if (!widgetType || !isWidgetType(widgetType)) {
    return NextResponse.json({ error: "Invalid widget type." }, { status: 400 });
  }

  try {
    const widget = await createWidgetInstance({
      userId: user.id,
      widgetType,
    });
    return NextResponse.json({ widget: widget as WidgetInstanceApiRecord }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create widget.",
      },
      { status: 400 },
    );
  }
}
