import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createOAuthState } from "@/lib/providers/oauth";

const providerSchema = z.enum(["spotify", "github", "twitter"]);

interface RouteContext {
  params: Promise<{ provider: string }>;
}

interface ConnectResponse {
  authorizeUrl?: string;
  error?: string;
}

function getBaseUrl(request: Request): string {
  const host = request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  if (!host) {
    throw new Error("Missing request host header.");
  }
  return `${protocol}://${host}`;
}

export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse<ConnectResponse>> {
  const { provider: providerParam } = await params;
  const parsedProvider = providerSchema.safeParse(providerParam);
  if (!parsedProvider.success) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }
  const provider = parsedProvider.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const baseUrl = getBaseUrl(request);

  if (provider === "spotify") {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? `${baseUrl}/api/auth/callback/spotify`;
    if (!clientId) {
      return NextResponse.json(
        { error: "Missing SPOTIFY_CLIENT_ID in environment." },
        { status: 400 },
      );
    }
    const scopes = [
      "user-read-recently-played",
      "user-top-read",
      "user-read-currently-playing",
      "user-library-read",
    ];
    const state = createOAuthState({
      userId: user.id,
      provider,
      nextPath: "/dashboard/connections",
    });
    const searchParams = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scopes.join(" "),
      redirect_uri: redirectUri,
      state,
    });
    return NextResponse.json(
      {
        authorizeUrl: `https://accounts.spotify.com/authorize?${searchParams.toString()}`,
      },
      { status: 200 },
    );
  }

  if (provider === "github") {
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${
      process.env.GITHUB_CLIENT_ID ?? ""
    }&scope=read:user`;
    return NextResponse.json({ authorizeUrl: githubUrl }, { status: 200 });
  }

  const twitterUrl = `https://twitter.com/i/oauth2/authorize?client_id=${
    process.env.TWITTER_CLIENT_ID ?? ""
  }`;
  return NextResponse.json({ authorizeUrl: twitterUrl }, { status: 200 });
}
