import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncGitHubWidgetsForUser } from "@/lib/providers/github";
import { revalidatePath } from "next/cache";

interface SyncResponse {
  updated?: number;
  error?: string;
}

export async function POST(): Promise<NextResponse<SyncResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const updated = await syncGitHubWidgetsForUser(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return NextResponse.json({ updated }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync GitHub widgets." },
      { status: 400 },
    );
  }
}
