import { createClient } from "@/lib/supabase/server";
import { normalizeUsername, usernameSchema } from "@/lib/validation/auth";
import { NextResponse } from "next/server";

interface AvailabilityResponse {
  available: boolean;
  message?: string;
}

export async function GET(request: Request): Promise<NextResponse<AvailabilityResponse>> {
  const { searchParams } = new URL(request.url);
  const rawUsername = searchParams.get("username");

  if (!rawUsername) {
    return NextResponse.json(
      { available: false, message: "Username is required." },
      { status: 400 },
    );
  }

  const normalized = normalizeUsername(rawUsername);
  const parsed = usernameSchema.safeParse(normalized);

  if (!parsed.success) {
    return NextResponse.json(
      { available: false, message: parsed.error.issues[0]?.message ?? "Invalid username." },
      { status: 200 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { available: false, message: "Could not verify username availability." },
      { status: 500 },
    );
  }

  return NextResponse.json({ available: !data }, { status: 200 });
}
