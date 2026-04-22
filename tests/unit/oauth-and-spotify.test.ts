import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createOAuthState,
  decryptToken,
  encryptToken,
  isTokenExpiringSoon,
} from "@/lib/providers/oauth";
import {
  buildSpotifyConnectUrl,
  decryptSpotifyTokens,
  encryptSpotifyTokens,
  ensureSpotifyTokens,
  exchangeSpotifyCodeForTokens,
  fetchSpotifyNowPlaying,
  fetchSpotifyRecentTracks,
  fetchSpotifyTopArtists,
  fetchSpotifyTopTracks,
  refreshSpotifyAccessToken,
} from "@/lib/providers/spotify";

interface MockResponseInit {
  ok: boolean;
  status: number;
  json?: unknown;
  text?: string;
}

function createMockResponse(init: MockResponseInit): Response {
  return {
    ok: init.ok,
    status: init.status,
    json: vi.fn(async () => init.json),
    text: vi.fn(async () => init.text ?? ""),
  } as unknown as Response;
}

describe("oauth helpers", () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = "unit-test-token-key";
  });

  it("encrypts and decrypts a token round-trip", () => {
    const encrypted = encryptToken("plain-token");
    expect(encrypted).not.toBe("plain-token");
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe("plain-token");
  });

  it("detects token expiration threshold correctly", () => {
    const now = Date.now();
    const soon = new Date(now + 2 * 60_000).toISOString();
    const later = new Date(now + 15 * 60_000).toISOString();
    expect(isTokenExpiringSoon(soon, 5)).toBe(true);
    expect(isTokenExpiringSoon(later, 5)).toBe(false);
    expect(isTokenExpiringSoon(null, 5)).toBe(false);
    expect(isTokenExpiringSoon("invalid-date", 5)).toBe(false);
  });

  it("creates an oauth state containing provider and user id", () => {
    const state = createOAuthState({
      userId: "user-123",
      provider: "spotify",
      nextPath: "/dashboard/connections",
    });
    const raw = Buffer.from(state, "base64url").toString("utf8");
    expect(raw.startsWith("user-123:spotify:/dashboard/connections:")).toBe(true);
  });
});

describe("spotify token and api helpers", () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = "unit-test-token-key";
    process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
    process.env.SPOTIFY_CLIENT_SECRET = "spotify-client-secret";
    process.env.SPOTIFY_REDIRECT_URI = "http://localhost:3000/api/auth/callback/spotify";
    vi.restoreAllMocks();
  });

  it("encrypts and decrypts spotify tokens", () => {
    const encrypted = encryptSpotifyTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: "2025-01-01T00:00:00.000Z",
    });
    const decrypted = decryptSpotifyTokens(encrypted);
    expect(decrypted).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: "2025-01-01T00:00:00.000Z",
    });
  });

  it("refreshes spotify access token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: {
          access_token: "new-access-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "user-read-recently-played",
        },
      }),
    );

    const refreshed = await refreshSpotifyAccessToken("refresh-token");
    expect(refreshed.accessToken).toBe("new-access-token");
    expect(refreshed.refreshToken).toBe("refresh-token");
    expect(refreshed.expiresAt).toBeTypeOf("string");
  });

  it("ensures spotify token refreshes when expiring soon", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: {
          access_token: "ensured-access-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "",
          refresh_token: "new-refresh-token",
        },
      }),
    );

    const ensured = await ensureSpotifyTokens({
      accessToken: "old-token",
      refreshToken: "old-refresh-token",
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    });

    expect(ensured.accessToken).toBe("ensured-access-token");
    expect(ensured.refreshToken).toBe("new-refresh-token");
  });

  it("does not refresh spotify token when expiry is far away", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const token = {
      accessToken: "current-token",
      refreshToken: "current-refresh-token",
      expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
    };
    const ensured = await ensureSpotifyTokens(token);
    expect(ensured).toEqual(token);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws if token is expiring soon and no refresh token is present", async () => {
    await expect(
      ensureSpotifyTokens({
        accessToken: "current-token",
        refreshToken: null,
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
      }),
    ).rejects.toThrow("Spotify refresh token missing.");
  });

  it("builds spotify authorize URL with required params", () => {
    const url = buildSpotifyConnectUrl("http://localhost:3000", "user-id-1");
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://accounts.spotify.com");
    expect(parsed.searchParams.get("client_id")).toBe("spotify-client-id");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/callback/spotify",
    );
    expect(parsed.searchParams.get("state")?.startsWith("user-id-1:")).toBe(true);
  });

  it("exchanges spotify authorization code for tokens", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: {
          access_token: "code-access-token",
          refresh_token: "code-refresh-token",
          expires_in: 1800,
        },
      }),
    );

    const tokens = await exchangeSpotifyCodeForTokens("oauth-code");
    expect(tokens.accessToken).toBe("code-access-token");
    expect(tokens.refreshToken).toBe("code-refresh-token");
    expect(tokens.expiresAt).toBeTypeOf("string");
  });

  it("fetches and normalizes spotify recent tracks", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: {
          items: [
            {
              played_at: "2025-01-01T00:00:00.000Z",
              track: {
                id: "track-1",
                name: "Track One",
                artists: [{ name: "Artist One" }],
                album: { images: [{ url: "https://img/1" }] },
              },
            },
          ],
        },
      }),
    );

    const tracks = await fetchSpotifyRecentTracks("spotify-access", 5);
    expect(tracks).toEqual([
      {
        id: "track-1",
        title: "Track One",
        artist: "Artist One",
        albumArtUrl: "https://img/1",
        playedAt: "2025-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("fetches spotify top artists and tracks", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          json: {
            items: [{ id: "artist-1", name: "Artist 1", images: [{ url: "https://img/a1" }] }],
          },
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          json: {
            items: [
              {
                id: "track-1",
                name: "Track 1",
                artists: [{ name: "Artist 1" }],
                album: { images: [{ url: "https://img/t1" }] },
              },
            ],
          },
        }),
      );

    const artists = await fetchSpotifyTopArtists("spotify-access", 5, "medium_term");
    const tracks = await fetchSpotifyTopTracks("spotify-access", 5, "medium_term");
    expect(artists[0]).toEqual({ id: "artist-1", name: "Artist 1", imageUrl: "https://img/a1" });
    expect(tracks[0]).toEqual({
      id: "track-1",
      title: "Track 1",
      artist: "Artist 1",
      albumArtUrl: "https://img/t1",
    });
  });

  it("fetches spotify now playing data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: {
          is_playing: true,
          item: {
            name: "Now Song",
            artists: [{ name: "Now Artist" }],
            album: { images: [{ url: "https://img/now" }] },
          },
        },
      }),
    );

    const nowPlaying = await fetchSpotifyNowPlaying("spotify-access");
    expect(nowPlaying).toEqual({
      isPlaying: true,
      title: "Now Song",
      artist: "Now Artist",
      albumArtUrl: "https://img/now",
    });
  });
});
