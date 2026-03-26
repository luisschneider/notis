import { NextResponse } from "next/server";
import { toggleWidgetInstanceVisibility } from "@/lib/server/widgets";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface VisibilityRequestBody {
  is_visible?: boolean;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<{ ok?: boolean; error?: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as VisibilityRequestBody;

    if (typeof body.is_visible !== "boolean") {
      return NextResponse.json({ error: "is_visible must be a boolean." }, { status: 400 });
    }

    await toggleWidgetInstanceVisibility(id, user.id, body.is_visible);

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update widget visibility." },
      { status: 400 },
    );
  }
}
