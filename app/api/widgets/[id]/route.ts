import {
  deleteWidgetInstance,
  getWidgetInstanceById,
  updateWidgetInstanceById,
} from "@/lib/server/widgets";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const widgetPatchSchema = z
  .object({
    config: z.record(z.string(), z.unknown()).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _request: Request,
  { params }: Params,
): Promise<NextResponse<{ error?: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getWidgetInstanceById(user.id, id);

  if (!existing) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }

  await deleteWidgetInstance(id, user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.username) {
    revalidatePath(`/u/${profile.username}`);
  }

  return NextResponse.json({}, { status: 204 });
}

interface PatchResponse {
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

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse<PatchResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const widget = await getWidgetInstanceById(user.id, id);

  if (!widget) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }

  return NextResponse.json({ widget }, { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: Params,
): Promise<NextResponse<PatchResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: z.infer<typeof widgetPatchSchema>;
  try {
    const json = (await request.json()) as unknown;
    payload = widgetPatchSchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid widget payload." }, { status: 400 });
  }

  if (!payload.config && !payload.data) {
    return NextResponse.json(
      { error: "At least one of config or data is required." },
      { status: 400 },
    );
  }

  const { id } = await params;

  try {
    const widget = await updateWidgetInstanceById(user.id, id, {
      config: payload.config,
      data: payload.data,
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return NextResponse.json({ widget }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not update widget.",
      },
      { status: 400 },
    );
  }
}
