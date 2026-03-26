import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTestCredentials,
  createAuthenticatedClient,
  createTestUserWithSession,
  deleteAuthUserById,
  type SessionAuthResult,
} from "../helpers/auth";
import {
  createAnonSupabaseClient,
  createServiceSupabaseClient,
  getSupabaseEnv,
  setClientAuthSession,
} from "../helpers/supabase";
import { addFixtureIds, takeFixtureIds } from "../helpers/fixtures";
import { POST as ogFetchPost } from "@/app/api/widgets/reading-list/og-fetch/route";

interface WidgetRow {
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
}

interface ReadingListItemRow {
  id: string;
  user_id: string;
  widget_instance_id: string;
  title: string;
  url: string | null;
  author: string | null;
  description: string | null;
  item_type: "article" | "book" | "podcast" | "video" | "other";
  added_at: string;
}

interface ConnectedAccountSelectRow {
  id: string;
  user_id: string;
  provider: "spotify" | "github" | "twitter";
}

interface ProfileSelectRow {
  id: string;
  username: string;
  display_name: string;
}

interface OgsResult {
  result: {
    ogTitle?: string;
    twitterTitle?: string;
    dcTitle?: string;
    ogDescription?: string;
    twitterDescription?: string;
    dcDescription?: string;
    ogImage?: Array<{ url?: string }>;
    ogSiteName?: string;
    requestUrl?: string;
  };
}

const mockOgs = vi.hoisted(() => vi.fn<() => Promise<OgsResult>>());

vi.mock("open-graph-scraper", () => ({
  default: mockOgs,
}));

const testUsers: SessionAuthResult[] = [];

function createUsername(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`.slice(0, 30);
}

async function createUserWithProfile(prefix: string): Promise<SessionAuthResult> {
  const credentials = buildTestCredentials(prefix);
  const user = await createTestUserWithSession(credentials);
  testUsers.push(user);
  return user;
}

async function createWidget(
  service: SupabaseClient,
  payload: {
    userId: string;
    widgetType: WidgetRow["widget_type"];
    position: number;
    config: Record<string, unknown>;
    data: Record<string, unknown>;
    isVisible?: boolean;
  },
): Promise<WidgetRow> {
  const { data, error } = await service
    .from("widget_instances")
    .insert({
      user_id: payload.userId,
      widget_type: payload.widgetType,
      position: payload.position,
      config: payload.config,
      data: payload.data,
      is_visible: payload.isVisible ?? true,
    })
    .select("*")
    .single<WidgetRow>();

  if (error || !data) {
    throw new Error(`Unable to create widget fixture: ${error?.message ?? "unknown error"}`);
  }

  addFixtureIds("widget", data.id);
  return data;
}

async function createReadingListItem(
  service: SupabaseClient,
  payload: {
    userId: string;
    widgetId: string;
    title: string;
    url: string | null;
    author: string | null;
    description: string | null;
    itemType: ReadingListItemRow["item_type"];
  },
): Promise<ReadingListItemRow> {
  const { data, error } = await service
    .from("reading_list_items")
    .insert({
      user_id: payload.userId,
      widget_instance_id: payload.widgetId,
      title: payload.title,
      url: payload.url,
      author: payload.author,
      description: payload.description,
      item_type: payload.itemType,
    })
    .select("*")
    .single<ReadingListItemRow>();

  if (error || !data) {
    throw new Error(`Unable to create reading list item fixture: ${error?.message ?? "unknown error"}`);
  }

  addFixtureIds("reading", data.id);
  return data;
}

describe("Supabase RLS, trigger, CRUD, and OG integration", () => {
  const service = createServiceSupabaseClient();
  const anon = createAnonSupabaseClient();

  beforeAll(async () => {
    // Sanity check test env once.
    getSupabaseEnv();
  });

  afterAll(async () => {
    const fixtureIds = takeFixtureIds();
    if (fixtureIds.reading.length > 0) {
      await service.from("reading_list_items").delete().in("id", fixtureIds.reading);
    }
    if (fixtureIds.widget.length > 0) {
      await service.from("widget_instances").delete().in("id", fixtureIds.widget);
    }
    if (fixtureIds.connected.length > 0) {
      await service.from("connected_accounts").delete().in("id", fixtureIds.connected);
    }

    for (const user of testUsers) {
      await service.from("profiles").delete().eq("id", user.userId);
      await deleteAuthUserById(user.userId);
    }
  });

  it("allows only owners to update their widget rows", async () => {
    const owner = await createUserWithProfile("rls_owner");
    const attacker = await createUserWithProfile("rls_attacker");

    const widget = await createWidget(service, {
      userId: owner.userId,
      widgetType: "custom_text_bio",
      position: 0,
      config: { title: "About" },
      data: { markdown: "owner content" },
    });

    const ownerClient = createAuthenticatedClient(owner.accessToken);
    const attackerClient = createAuthenticatedClient(attacker.accessToken);

    const { data: ownerUpdate, error: ownerError } = await ownerClient
      .from("widget_instances")
      .update({ data: { markdown: "owner updated" } })
      .eq("id", widget.id)
      .eq("user_id", owner.userId)
      .select("id, data")
      .single();
    expect(ownerError).toBeNull();
    expect((ownerUpdate as { id: string }).id).toBe(widget.id);

    const { data: attackerUpdate, error: attackerError } = await attackerClient
      .from("widget_instances")
      .update({ data: { markdown: "attacker update" } })
      .eq("id", widget.id)
      .eq("user_id", owner.userId)
      .select("id, data")
      .maybeSingle();
    expect(attackerError).toBeNull();
    expect(attackerUpdate).toBeNull();

    const { data: finalWidget, error: finalError } = await service
      .from("widget_instances")
      .select("data")
      .eq("id", widget.id)
      .single<{ data: { markdown?: string } }>();
    expect(finalError).toBeNull();
    expect(finalWidget?.data.markdown).toBe("owner updated");
  }, 20_000);

  it("makes public board rows readable anonymously while connected_accounts stay private", async () => {
    const user = await createUserWithProfile("public_board");
    const username = createUsername("public");

    const { error: profileUpdateError } = await service
      .from("profiles")
      .update({ username, display_name: "Public User" })
      .eq("id", user.userId);
    expect(profileUpdateError).toBeNull();

    const widget = await createWidget(service, {
      userId: user.userId,
      widgetType: "custom_text_quote",
      position: 0,
      config: { title: "Quote" },
      data: { quote: "Public quote" },
      isVisible: true,
    });

    const { data: publicProfile, error: publicProfileError } = await anon
      .from("profiles")
      .select("id, username, display_name")
      .eq("username", username)
      .single<ProfileSelectRow>();
    expect(publicProfileError).toBeNull();
    expect(publicProfile?.id).toBe(user.userId);

    const { data: publicWidgets, error: publicWidgetsError } = await anon
      .from("widget_instances")
      .select("id, user_id, widget_type")
      .eq("id", widget.id);
    expect(publicWidgetsError).toBeNull();
    expect((publicWidgets ?? []).length).toBe(1);

    const { data: insertedAccount, error: insertAccountError } = await service
      .from("connected_accounts")
      .insert({
        user_id: user.userId,
        provider: "github",
        access_token: "enc-access",
        refresh_token: "enc-refresh",
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        provider_user_id: `gh-${user.userId}`,
        needs_reauth: false,
      })
      .select("id")
      .single<{ id: string }>();
    expect(insertAccountError).toBeNull();
    if (insertedAccount?.id) {
      addFixtureIds("connected", insertedAccount.id);
    }

    const { data: anonConnectedRows, error: anonConnectedError } = await anon
      .from("connected_accounts")
      .select("id, user_id, provider");
    expect(anonConnectedError).toBeNull();
    expect((anonConnectedRows ?? []).length).toBe(0);

    const ownerClient = createAuthenticatedClient(user.accessToken);
    const { data: ownerConnectedRows, error: ownerConnectedError } = await ownerClient
      .from("connected_accounts")
      .select("id, user_id, provider")
      .eq("user_id", user.userId);
    expect(ownerConnectedError).toBeNull();
    expect((ownerConnectedRows as ConnectedAccountSelectRow[] | null)?.length ?? 0).toBe(1);
  });

  it("creates profile row through auth trigger using signup metadata", async () => {
    const credentials = buildTestCredentials("trigger");
    const anonClient = createAnonSupabaseClient();

    const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          username: credentials.username,
          display_name: credentials.displayName,
        },
      },
    });
    if (signUpError || !signUpData.user) {
      throw new Error(`Trigger test sign-up failed: ${signUpError?.message ?? "missing user"}`);
    }

    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (signInError || !signInData.session) {
      throw new Error(`Trigger test sign-in failed: ${signInError?.message ?? "missing session"}`);
    }

    testUsers.push({
      userId: signUpData.user.id,
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      email: credentials.email,
      password: credentials.password,
      username: credentials.username,
      displayName: credentials.displayName,
    });

    let profile: ProfileSelectRow | null = null;
    let profileErrorMessage: string | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const query = await service
        .from("profiles")
        .select("id, username, display_name")
        .eq("id", signUpData.user.id)
        .maybeSingle<ProfileSelectRow>();
      if (query.data) {
        profile = query.data;
        break;
      }
      profileErrorMessage = query.error?.message ?? null;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    expect(profile).not.toBeNull();
    if (!profile) {
      throw new Error(`Expected profile trigger row, last error: ${profileErrorMessage ?? "none"}`);
    }
    expect(profile?.username).toMatch(/^[a-z0-9_]{3,20}$/);
    expect(profile?.display_name).toBe(credentials.displayName);
  });

  it("supports widget CRUD and reading list CRUD under user session", async () => {
    const user = await createUserWithProfile("crud");
    const userClient = createAuthenticatedClient(user.accessToken);

    const { data: createdWidget, error: createWidgetError } = await userClient
      .from("widget_instances")
      .insert({
        user_id: user.userId,
        widget_type: "reading_list_items",
        position: 0,
        config: { title: "Reading List", maxItems: 5 },
        data: { items: [] },
      })
      .select("*")
      .single<WidgetRow>();
    expect(createWidgetError).toBeNull();
    if (!createdWidget) {
      throw new Error("Expected created widget");
    }
    addFixtureIds("widget", createdWidget.id);

    const { data: updatedWidget, error: updateWidgetError } = await userClient
      .from("widget_instances")
      .update({ config: { title: "Reading Updated", maxItems: 6 } })
      .eq("id", createdWidget.id)
      .eq("user_id", user.userId)
      .select("id, config")
      .single<{ id: string; config: { title?: string } }>();
    expect(updateWidgetError).toBeNull();
    expect(updatedWidget?.config.title).toBe("Reading Updated");

    const readingItem = await createReadingListItem(service, {
      userId: user.userId,
      widgetId: createdWidget.id,
      title: "Interesting article",
      url: "https://example.com/article",
      author: "Example Author",
      description: "Interesting description",
      itemType: "article",
    });

    const { data: items, error: readItemsError } = await userClient
      .from("reading_list_items")
      .select("id, title")
      .eq("widget_instance_id", createdWidget.id);
    expect(readItemsError).toBeNull();
    expect((items ?? []).some((item) => (item as { id: string }).id === readingItem.id)).toBe(true);

    const { error: deleteItemError } = await userClient
      .from("reading_list_items")
      .delete()
      .eq("id", readingItem.id)
      .eq("user_id", user.userId);
    expect(deleteItemError).toBeNull();

    const { error: deleteWidgetError } = await userClient
      .from("widget_instances")
      .delete()
      .eq("id", createdWidget.id)
      .eq("user_id", user.userId);
    expect(deleteWidgetError).toBeNull();
  });

  it("returns OG metadata via route handler", async () => {
    mockOgs.mockResolvedValueOnce({
      result: {
        ogTitle: "Example OG Title",
        ogDescription: "Example OG Description",
        ogImage: [{ url: "https://example.com/image.png" }],
        ogSiteName: "Example Site",
        requestUrl: "https://example.com/article",
      },
    });

    const request = new Request("http://localhost:3000/api/widgets/reading-list/og-fetch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com/article",
      }),
    });

    const response = await ogFetchPost(request);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      title?: string;
      description?: string;
      image?: string;
      siteName?: string;
      url?: string;
    };

    expect(payload.title).toBe("Example OG Title");
    expect(payload.description).toBe("Example OG Description");
    expect(payload.siteName).toBe("Example Site");
    expect(payload.image).toBe("https://example.com/image.png");
    expect(typeof payload.url).toBe("string");
    expect(mockOgs).toHaveBeenCalled();
  });

  it("keeps connected_accounts hidden even with plain anon client session", async () => {
    const user = await createUserWithProfile("connected_anon");
    const userClient = createAuthenticatedClient(user.accessToken);

    const { data: insertedAccount, error: insertError } = await service
      .from("connected_accounts")
      .insert({
        user_id: user.userId,
        provider: "spotify",
        access_token: "encrypted-token",
        refresh_token: null,
        expires_at: null,
        provider_user_id: `spotify-${user.userId}`,
        needs_reauth: false,
      })
      .select("id")
      .single<{ id: string }>();
    expect(insertError).toBeNull();
    if (insertedAccount?.id) {
      addFixtureIds("connected", insertedAccount.id);
    }

    const scopedAnon = createAnonSupabaseClient();
    await setClientAuthSession(scopedAnon, {
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
    });

    const { data: ownerVisibleRows, error: ownerVisibleError } = await userClient
      .from("connected_accounts")
      .select("id, user_id")
      .eq("user_id", user.userId);
    expect(ownerVisibleError).toBeNull();
    expect((ownerVisibleRows ?? []).length).toBe(1);

    const { data: anonRows, error: anonError } = await createAnonSupabaseClient()
      .from("connected_accounts")
      .select("id");
    expect(anonError).toBeNull();
    expect((anonRows ?? []).length).toBe(0);
  });
});
