import { createClient } from "@/lib/supabase/server";
import { reorderWidgetInstances } from "@/lib/server/widgets";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

interface ReorderPayload {
  items?: Array<{
    id: string;
    position: number;
  }>;
}

interface ApiResponse {
  success?: boolean;
  error?: string;
}

export async function PATCH(request: Request): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as ReorderPayload;
  const items = body.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items is required." }, { status: 400 });
  }

  try {
    const orderedIds = [...items]
      .sort((first, second) => first.position - second.position)
      .map((item) => item.id);
    await reorderWidgetInstances(user.id, orderedIds);

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not reorder widgets.",
      },
      { status: 400 },
    );
  }
}

