import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SupabaseEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

type Provider = "spotify" | "github" | "twitter";

export interface SeededUser {
  userId: string;
  email: string;
  password: string;
  username: string;
  displayName: string;
}

interface CreateSeededUserInput {
  usernamePrefix: string;
  displayNamePrefix: string;
  password: string;
}

interface EnsureWidgetInput {
  userId: string;
  widgetType: string;
  position: number;
  config: Record<string, unknown>;
  data: Record<string, unknown>;
  isVisible: boolean;
}

interface EnsureConnectedAccountInput {
  userId: string;
  provider: Provider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  providerUserId: string;
  needsReauth: boolean;
}

interface SetProfileInput {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

function getEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars for Playwright tests.");
  }
  return { url, anonKey, serviceRoleKey };
}

function createServiceClient(): SupabaseClient {
  const { url, serviceRoleKey } = getEnv();
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function randomEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

function randomUsername(prefix: string): string {
  const sanitizedPrefix = prefix.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return `${sanitizedPrefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`.slice(0, 20);
}

async function ensureProfileRow(
  service: SupabaseClient,
  payload: {
    id: string;
    email: string;
    username: string;
    displayName: string;
  },
): Promise<void> {
  const { error } = await service.from("profiles").upsert(
    {
      id: payload.id,
      email: payload.email,
      username: payload.username,
      name: payload.displayName,
      display_name: payload.displayName,
    },
    { onConflict: "id" },
  );
  if (error) {
    throw new Error(`Failed ensuring profile row: ${error.message}`);
  }
}

export async function createSeededUser(input: CreateSeededUserInput): Promise<SeededUser> {
  const service = createServiceClient();
  const email = randomEmail(input.usernamePrefix);
  const username = randomUsername(input.usernamePrefix);
  const displayName = `${input.displayNamePrefix} ${randomUUID().slice(0, 6)}`;

  const { data, error } = await service.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      username,
      display_name: displayName,
    },
  });

  if (error || !data.user) {
    throw new Error(`Unable to create seeded user: ${error?.message ?? "unknown error"}`);
  }

  await ensureProfileRow(service, {
    id: data.user.id,
    email,
    username,
    displayName,
  });

  return {
    userId: data.user.id,
    email,
    password: input.password,
    username,
    displayName,
  };
}

export async function ensureWidget(input: EnsureWidgetInput): Promise<{ id: string }> {
  const service = createServiceClient();
  const { data: existingRows, error: existingError } = await service
    .from("widget_instances")
    .select("id")
    .eq("user_id", input.userId)
    .eq("widget_type", input.widgetType)
    .order("position", { ascending: true });
  if (existingError) {
    throw new Error(`Unable to query widget rows: ${existingError.message}`);
  }

  const existingId = existingRows?.[0]?.id as string | undefined;
  if (existingId) {
    const { error: updateError } = await service
      .from("widget_instances")
      .update({
        position: input.position,
        config: input.config,
        data: input.data,
        is_visible: input.isVisible,
      })
      .eq("id", existingId)
      .eq("user_id", input.userId);
    if (updateError) {
      throw new Error(`Unable to update widget: ${updateError.message}`);
    }
    return { id: existingId };
  }

  const { data, error } = await service
    .from("widget_instances")
    .insert({
      user_id: input.userId,
      widget_type: input.widgetType,
      position: input.position,
      config: input.config,
      data: input.data,
      is_visible: input.isVisible,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Unable to insert widget: ${error?.message ?? "unknown error"}`);
  }
  return { id: data.id };
}

export async function ensureConnectedAccount(input: EnsureConnectedAccountInput): Promise<void> {
  const service = createServiceClient();
  const { error } = await service.from("connected_accounts").upsert(
    {
      user_id: input.userId,
      provider: input.provider,
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
      expires_at: input.expiresAt,
      provider_user_id: input.providerUserId,
      needs_reauth: input.needsReauth,
    },
    { onConflict: "user_id,provider" },
  );
  if (error) {
    throw new Error(`Unable to upsert connected account: ${error.message}`);
  }
}

export async function setProfile(input: SetProfileInput): Promise<void> {
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({
      username: input.username,
      display_name: input.displayName,
      name: input.displayName,
      bio: input.bio,
      avatar_url: input.avatarUrl,
    })
    .eq("id", input.userId);
  if (error) {
    throw new Error(`Unable to update profile: ${error.message}`);
  }
}

export async function removeConnectedAccount(userId: string, provider: Provider): Promise<void> {
  const service = createServiceClient();
  const { error } = await service
    .from("connected_accounts")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) {
    throw new Error(`Unable to delete connected account: ${error.message}`);
  }
}

export async function removeUserData(userId: string): Promise<void> {
  const service = createServiceClient();
  await service.from("reading_list_items").delete().eq("user_id", userId);
  await service.from("widget_instances").delete().eq("user_id", userId);
  await service.from("connected_accounts").delete().eq("user_id", userId);
  await service.from("profiles").delete().eq("id", userId);
}

export async function deleteUserById(userId: string): Promise<void> {
  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error && !error.message.toLowerCase().includes("user not found")) {
    throw new Error(`Unable to delete user ${userId}: ${error.message}`);
  }
}
