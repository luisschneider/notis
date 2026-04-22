import { createClient } from "@/lib/supabase/server";
import { encryptSpotifyTokens } from "@/lib/providers/spotify";
import { upsertConnectedAccount } from "@/lib/providers/oauth";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard/connections";
  const state = requestUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/connections?error=missing_code", requestUrl.origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ?? `${requestUrl.origin}/api/auth/callback/spotify`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/dashboard/connections?error=missing_spotify_credentials", requestUrl.origin),
    );
  }

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/connections?error=spotify_token_exchange_failed", requestUrl.origin),
    );
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  if (!tokenPayload.access_token) {
    return NextResponse.redirect(
      new URL("/dashboard/connections?error=spotify_missing_access_token", requestUrl.origin),
    );
  }

  const spotifyProfileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });

  if (!spotifyProfileResponse.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/connections?error=spotify_profile_failed", requestUrl.origin),
    );
  }

  const spotifyProfile = (await spotifyProfileResponse.json()) as {
    id?: string;
  };
  const providerUserId = spotifyProfile.id ?? `spotify:${user.id}`;
  const expiresAt =
    typeof tokenPayload.expires_in === "number"
      ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
      : null;

  const encrypted = encryptSpotifyTokens({
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token ?? null,
    expiresAt,
  });

  await upsertConnectedAccount({
    user_id: user.id,
    provider: "spotify",
    access_token: encrypted.access_token,
    refresh_token: encrypted.refresh_token,
    expires_at: encrypted.expires_at,
    provider_user_id: providerUserId,
    needs_reauth: false,
  });

  const stateUserId = state?.split(":")[0];
  if (stateUserId && stateUserId !== user.id) {
    return NextResponse.redirect(
      new URL("/dashboard/connections?error=invalid_spotify_state", requestUrl.origin),
    );
  }

  return NextResponse.redirect(
    new URL(`${next}?provider=spotify&status=connected`, requestUrl.origin),
  );
}
