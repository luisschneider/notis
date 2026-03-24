import { decryptToken, encryptToken, isTokenExpiringSoon } from "./oauth";
import { createClient } from "@/lib/supabase/server";
import type { ConnectedAccountRow, WidgetInstanceRow } from "@/lib/supabase/types";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_RECENTLY_PLAYED_URL = "https://api.spotify.com/v1/me/player/recently-played";
const SPOTIFY_TOP_ARTISTS_URL = "https://api.spotify.com/v1/me/top/artists";
const SPOTIFY_TOP_TRACKS_URL = "https://api.spotify.com/v1/me/top/tracks";
const SPOTIFY_NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";

export type SpotifyRange = "short_term" | "medium_term" | "long_term";

export interface SpotifyConnectionTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}

export interface SpotifyRecentTrack {
  id: string;
  title: string;
  artist: string;
  albumArtUrl: string;
  playedAt: string;
}

export interface SpotifyTopArtist {
  id: string;
  name: string;
  imageUrl: string;
}

export interface SpotifyTopTrack {
  id: string;
  title: string;
  artist: string;
  albumArtUrl: string;
}

export interface SpotifyNowPlaying {
  isPlaying: boolean;
  title: string;
  artist: string;
  albumArtUrl: string;
}

interface SpotifyTokenRefreshResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

function getSpotifyClientId(): string {
  const value = process.env.SPOTIFY_CLIENT_ID;
  if (!value) {
    throw new Error("Missing SPOTIFY_CLIENT_ID environment variable.");
  }
  return value;
}

function getSpotifyClientSecret(): string {
  const value = process.env.SPOTIFY_CLIENT_SECRET;
  if (!value) {
    throw new Error("Missing SPOTIFY_CLIENT_SECRET environment variable.");
  }
  return value;
}

function getBasicAuthHeader(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function decryptSpotifyTokens(tokens: {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
}): SpotifyConnectionTokens {
  return {
    accessToken: decryptToken(tokens.access_token),
    refreshToken: tokens.refresh_token ? decryptToken(tokens.refresh_token) : null,
    expiresAt: tokens.expires_at,
  };
}

export function encryptSpotifyTokens(tokens: SpotifyConnectionTokens): {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
} {
  return {
    access_token: encryptToken(tokens.accessToken),
    refresh_token: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
    expires_at: tokens.expiresAt,
  };
}

export async function refreshSpotifyAccessToken(
  refreshToken: string,
): Promise<SpotifyConnectionTokens> {
  const clientId = getSpotifyClientId();
  const clientSecret = getSpotifyClientSecret();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${getBasicAuthHeader(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to refresh Spotify token: ${text}`);
  }

  const json = (await response.json()) as SpotifyTokenRefreshResponse;
  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt,
  };
}

async function spotifyFetchJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    next: { revalidate: 0 },
  });

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

export async function fetchSpotifyRecentTracks(
  accessToken: string,
  maxItems: number,
): Promise<SpotifyRecentTrack[]> {
  const limit = Math.max(1, Math.min(20, Math.floor(maxItems)));
  const url = `${SPOTIFY_RECENTLY_PLAYED_URL}?limit=${limit}`;
  const json = await spotifyFetchJson<{
    items?: Array<{
      played_at?: string;
      track?: {
        id?: string;
        name?: string;
        artists?: Array<{ name?: string }>;
        album?: {
          images?: Array<{ url?: string }>;
        };
      };
    }>;
  }>(url, accessToken);

  const items = Array.isArray(json.items) ? json.items : [];
  return items
    .map((item) => {
      const track = item.track;
      if (!track || !track.id || !track.name) {
        return null;
      }
      const firstArtist = Array.isArray(track.artists) ? track.artists[0] : undefined;
      const firstImage = Array.isArray(track.album?.images) ? track.album?.images[0] : undefined;
      return {
        id: track.id,
        title: track.name,
        artist: firstArtist?.name ?? "Unknown artist",
        albumArtUrl: firstImage?.url ?? "",
        playedAt: item.played_at ?? new Date().toISOString(),
      };
    })
    .filter((item): item is SpotifyRecentTrack => item !== null);
}

export async function fetchSpotifyTopArtists(
  accessToken: string,
  maxItems: number,
  range: SpotifyRange,
): Promise<SpotifyTopArtist[]> {
  const limit = Math.max(1, Math.min(20, Math.floor(maxItems)));
  const url = `${SPOTIFY_TOP_ARTISTS_URL}?limit=${limit}&time_range=${range}`;
  const json = await spotifyFetchJson<{
    items?: Array<{
      id?: string;
      name?: string;
      images?: Array<{ url?: string }>;
    }>;
  }>(url, accessToken);

  const items = Array.isArray(json.items) ? json.items : [];
  return items
    .map((item) => {
      if (!item.id || !item.name) {
        return null;
      }
      return {
        id: item.id,
        name: item.name,
        imageUrl: Array.isArray(item.images) ? item.images[0]?.url ?? "" : "",
      };
    })
    .filter((item): item is SpotifyTopArtist => item !== null);
}

export async function fetchSpotifyTopTracks(
  accessToken: string,
  maxItems: number,
  range: SpotifyRange,
): Promise<SpotifyTopTrack[]> {
  const limit = Math.max(1, Math.min(20, Math.floor(maxItems)));
  const url = `${SPOTIFY_TOP_TRACKS_URL}?limit=${limit}&time_range=${range}`;
  const json = await spotifyFetchJson<{
    items?: Array<{
      id?: string;
      name?: string;
      artists?: Array<{ name?: string }>;
      album?: {
        images?: Array<{ url?: string }>;
      };
    }>;
  }>(url, accessToken);

  const items = Array.isArray(json.items) ? json.items : [];
  return items
    .map((item) => {
      if (!item.id || !item.name) {
        return null;
      }
      return {
        id: item.id,
        title: item.name,
        artist: Array.isArray(item.artists) ? item.artists[0]?.name ?? "Unknown artist" : "Unknown artist",
        albumArtUrl: Array.isArray(item.album?.images) ? item.album?.images[0]?.url ?? "" : "",
      };
    })
    .filter((item): item is SpotifyTopTrack => item !== null);
}

export async function fetchSpotifyNowPlaying(accessToken: string): Promise<SpotifyNowPlaying> {
  const json = await spotifyFetchJson<{
    is_playing?: boolean;
    item?: {
      name?: string;
      artists?: Array<{ name?: string }>;
      album?: {
        images?: Array<{ url?: string }>;
      };
    };
  }>(SPOTIFY_NOW_PLAYING_URL, accessToken);

  const track = json.item;
  return {
    isPlaying: Boolean(json.is_playing),
    title: track?.name ?? "",
    artist: Array.isArray(track?.artists) ? track?.artists[0]?.name ?? "" : "",
    albumArtUrl: Array.isArray(track?.album?.images) ? track?.album?.images[0]?.url ?? "" : "",
  };
}

export async function ensureSpotifyTokens(
  tokens: SpotifyConnectionTokens,
): Promise<SpotifyConnectionTokens> {
  if (!isTokenExpiringSoon(tokens.expiresAt, 5)) {
    return tokens;
  }
  if (!tokens.refreshToken) {
    throw new Error("Spotify refresh token missing.");
  }
  return refreshSpotifyAccessToken(tokens.refreshToken);
}

export function buildSpotifyConnectUrl(baseUrl: string, userId: string): string {
  const clientId = getSpotifyClientId();
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? `${baseUrl}/api/auth/callback/spotify`;
  const scopes = [
    "user-read-recently-played",
    "user-top-read",
    "user-read-currently-playing",
    "user-library-read",
  ];
  const state = `${userId}:${Date.now()}`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    state,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

interface SpotifyTokenExchangeResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export async function exchangeSpotifyCodeForTokens(code: string): Promise<SpotifyConnectionTokens> {
  const clientId = getSpotifyClientId();
  const clientSecret = getSpotifyClientSecret();
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback/spotify";
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${getBasicAuthHeader(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  const json = (await response.json()) as SpotifyTokenExchangeResponse;
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Failed to exchange Spotify code.");
  }

  const expiresAt =
    typeof json.expires_in === "number"
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null;

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt,
  };
}

function parseWidgetRows(
  rows: Array<{
    id: string;
    widget_type: string;
    config: Record<string, unknown>;
  }>,
): WidgetInstanceRow[] {
  return rows as WidgetInstanceRow[];
}

async function getSpotifyConnectedAccount(userId: string): Promise<ConnectedAccountRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "spotify")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Spotify connection: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return data as ConnectedAccountRow;
}

export async function syncSpotifyWidgetsForUser(userId: string): Promise<number> {
  const supabase = await createClient();
  const account = await getSpotifyConnectedAccount(userId);
  if (!account) {
    return 0;
  }

  const decrypted = decryptSpotifyTokens({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expires_at: account.expires_at,
  });
  const ensured = await ensureSpotifyTokens(decrypted);
  if (
    ensured.accessToken !== decrypted.accessToken ||
    ensured.refreshToken !== decrypted.refreshToken ||
    ensured.expiresAt !== decrypted.expiresAt
  ) {
    const encrypted = encryptSpotifyTokens(ensured);
    await supabase
      .from("connected_accounts")
      .update({
        access_token: encrypted.access_token,
        refresh_token: encrypted.refresh_token,
        expires_at: encrypted.expires_at,
        needs_reauth: false,
      })
      .eq("id", account.id)
      .eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("widget_instances")
    .select("id, widget_type, config")
    .eq("user_id", userId)
    .in("widget_type", [
      "spotify_recent_tracks",
      "spotify_top_artists",
      "spotify_top_tracks",
      "spotify_now_playing",
    ]);

  if (error) {
    throw new Error(`Failed to load Spotify widgets: ${error.message}`);
  }

  const widgets = parseWidgetRows(data ?? []);
  let updated = 0;

  for (const widget of widgets) {
    if (widget.widget_type === "spotify_recent_tracks") {
      const maxItems =
        typeof widget.config.maxItems === "number" ? widget.config.maxItems : 5;
      const tracks = await fetchSpotifyRecentTracks(ensured.accessToken, maxItems);
      const { error: updateError } = await supabase
        .from("widget_instances")
        .update({
          data: { tracks },
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", widget.id)
        .eq("user_id", userId);
      if (updateError) {
        throw new Error(`Failed to update Spotify widget ${widget.id}: ${updateError.message}`);
      }
      updated += 1;
      continue;
    }

    if (widget.widget_type === "spotify_top_artists") {
      const maxItems =
        typeof widget.config.maxItems === "number" ? widget.config.maxItems : 5;
      const range =
        widget.config.range === "short_term" || widget.config.range === "long_term"
          ? widget.config.range
          : "medium_term";
      const artists = await fetchSpotifyTopArtists(ensured.accessToken, maxItems, range);
      const { error: updateError } = await supabase
        .from("widget_instances")
        .update({
          data: { artists },
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", widget.id)
        .eq("user_id", userId);
      if (updateError) {
        throw new Error(`Failed to update Spotify widget ${widget.id}: ${updateError.message}`);
      }
      updated += 1;
      continue;
    }

    if (widget.widget_type === "spotify_top_tracks") {
      const maxItems =
        typeof widget.config.maxItems === "number" ? widget.config.maxItems : 5;
      const range =
        widget.config.range === "short_term" || widget.config.range === "long_term"
          ? widget.config.range
          : "medium_term";
      const tracks = await fetchSpotifyTopTracks(ensured.accessToken, maxItems, range);
      const { error: updateError } = await supabase
        .from("widget_instances")
        .update({
          data: { tracks },
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", widget.id)
        .eq("user_id", userId);
      if (updateError) {
        throw new Error(`Failed to update Spotify widget ${widget.id}: ${updateError.message}`);
      }
      updated += 1;
      continue;
    }

    const nowPlaying = await fetchSpotifyNowPlaying(ensured.accessToken);
    const { error: updateError } = await supabase
      .from("widget_instances")
      .update({
        data: nowPlaying,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", widget.id)
      .eq("user_id", userId);
    if (updateError) {
      throw new Error(`Failed to update Spotify widget ${widget.id}: ${updateError.message}`);
    }
    updated += 1;
  }

  return updated;
}

export async function syncSpotifyWidgetById(userId: string, widgetId: string): Promise<number> {
  const supabase = await createClient();
  const account = await getSpotifyConnectedAccount(userId);
  if (!account) {
    return 0;
  }

  const decrypted = decryptSpotifyTokens({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expires_at: account.expires_at,
  });
  const ensured = await ensureSpotifyTokens(decrypted);
  if (
    ensured.accessToken !== decrypted.accessToken ||
    ensured.refreshToken !== decrypted.refreshToken ||
    ensured.expiresAt !== decrypted.expiresAt
  ) {
    const encrypted = encryptSpotifyTokens(ensured);
    await supabase
      .from("connected_accounts")
      .update({
        access_token: encrypted.access_token,
        refresh_token: encrypted.refresh_token,
        expires_at: encrypted.expires_at,
        needs_reauth: false,
      })
      .eq("id", account.id)
      .eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("widget_instances")
    .select("id, widget_type, config")
    .eq("id", widgetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Spotify widget: ${error.message}`);
  }
  if (!data) {
    return 0;
  }

  const widget = parseWidgetRows([data])[0];
  if (!widget) {
    return 0;
  }

  if (widget.widget_type === "spotify_recent_tracks") {
    const maxItems =
      typeof widget.config.maxItems === "number" ? widget.config.maxItems : 5;
    const tracks = await fetchSpotifyRecentTracks(ensured.accessToken, maxItems);
    const { error: updateError } = await supabase
      .from("widget_instances")
      .update({
        data: { tracks },
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", widget.id)
      .eq("user_id", userId);
    if (updateError) {
      throw new Error(`Failed to update Spotify widget ${widget.id}: ${updateError.message}`);
    }
    return 1;
  }

  if (widget.widget_type === "spotify_top_artists") {
    const maxItems =
      typeof widget.config.maxItems === "number" ? widget.config.maxItems : 5;
    const range =
      widget.config.range === "short_term" || widget.config.range === "long_term"
        ? widget.config.range
        : "medium_term";
    const artists = await fetchSpotifyTopArtists(ensured.accessToken, maxItems, range);
    const { error: updateError } = await supabase
      .from("widget_instances")
      .update({
        data: { artists },
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", widget.id)
      .eq("user_id", userId);
    if (updateError) {
      throw new Error(`Failed to update Spotify widget ${widget.id}: ${updateError.message}`);
    }
    return 1;
  }

  if (widget.widget_type === "spotify_top_tracks") {
    const maxItems =
      typeof widget.config.maxItems === "number" ? widget.config.maxItems : 5;
    const range =
      widget.config.range === "short_term" || widget.config.range === "long_term"
        ? widget.config.range
        : "medium_term";
    const tracks = await fetchSpotifyTopTracks(ensured.accessToken, maxItems, range);
    const { error: updateError } = await supabase
      .from("widget_instances")
      .update({
        data: { tracks },
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", widget.id)
      .eq("user_id", userId);
    if (updateError) {
      throw new Error(`Failed to update Spotify widget ${widget.id}: ${updateError.message}`);
    }
    return 1;
  }

  if (widget.widget_type === "spotify_now_playing") {
    const nowPlaying = await fetchSpotifyNowPlaying(ensured.accessToken);
    const { error: updateError } = await supabase
      .from("widget_instances")
      .update({
        data: nowPlaying,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", widget.id)
      .eq("user_id", userId);
    if (updateError) {
      throw new Error(`Failed to update Spotify widget ${widget.id}: ${updateError.message}`);
    }
    return 1;
  }

  return 0;
}
