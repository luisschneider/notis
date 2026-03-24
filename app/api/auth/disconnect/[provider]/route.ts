import { createClient } from "@/lib/supabase/server";
import { deleteConnectedAccountByProvider } from "@/lib/providers/oauth";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    provider: string;
  }>;
}

interface DisconnectResponse {
  success?: boolean;
  error?: string;
}

function isSupportedProvider(value: string): value is "spotify" | "github" | "twitter" {
  return value === "spotify" || value === "github" || value === "twitter";
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse<DisconnectResponse>> {
  const { provider } = await params;
  if (!isSupportedProvider(provider)) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await deleteConnectedAccountByProvider(user.id, provider);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to disconnect provider.",
      },
      { status: 400 },
    );
  }
}
