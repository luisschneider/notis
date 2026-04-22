import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./supabase";

export interface AuthSessionResult {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export interface SessionAuthResult extends AuthSessionResult {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface TestUserCredentials {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function buildTestCredentials(prefix: string): TestUserCredentials {
  const suffix = randomSuffix();
  return {
    email: `${prefix}-${suffix}@example.com`,
    password: "Password123!",
    username: `${prefix}_${suffix.replace(/[^a-z0-9]/g, "").slice(0, 18)}`.slice(0, 30),
    displayName: `${prefix} ${suffix.slice(0, 6)}`,
  };
}

export async function signUpAndCreateSession(
  client: SupabaseClient,
  credentials: TestUserCredentials,
): Promise<AuthSessionResult> {
  const signUpResult = await client.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      emailRedirectTo: "http://localhost:3000/auth/callback",
      data: {
        username: credentials.username,
        display_name: credentials.displayName,
      },
    },
  });

  if (signUpResult.error) {
    throw new Error(`Failed test sign-up: ${signUpResult.error.message}`);
  }

  const signInResult = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (signInResult.error || !signInResult.data.session || !signInResult.data.user) {
    throw new Error(
      `Failed test sign-in: ${signInResult.error?.message ?? "No session returned."}`,
    );
  }

  return {
    userId: signInResult.data.user.id,
    accessToken: signInResult.data.session.access_token,
    refreshToken: signInResult.data.session.refresh_token,
  };
}

export async function createTestUserWithSession(
  credentials: TestUserCredentials,
): Promise<SessionAuthResult> {
  const { url, anonKey } = getSupabaseEnv();
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const auth = await signUpAndCreateSession(client, credentials);
  return {
    ...auth,
    email: credentials.email,
    password: credentials.password,
    username: credentials.username,
    displayName: credentials.displayName,
  };
}

export async function signUpAndSignIn(
  email: string,
  password: string,
  metadata?: {
    username?: string;
    display_name?: string;
  },
): Promise<AuthSessionResult> {
  const { url, anonKey } = getSupabaseEnv();
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const signUpResult = await client.auth.signUp({
    email,
    password,
    options: metadata
      ? {
          data: metadata,
        }
      : undefined,
  });

  if (signUpResult.error) {
    throw new Error(`Failed test sign-up: ${signUpResult.error.message}`);
  }

  const signInResult = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error || !signInResult.data.session || !signInResult.data.user) {
    throw new Error(
      `Failed test sign-in: ${signInResult.error?.message ?? "No session returned."}`,
    );
  }

  return {
    userId: signInResult.data.user.id,
    accessToken: signInResult.data.session.access_token,
    refreshToken: signInResult.data.session.refresh_token,
  };
}

export function createAuthenticatedClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
    },
  });
}

export async function deleteAuthUserById(userId: string): Promise<void> {
  const { createServiceSupabaseClient } = await import("./supabase");
  const service = createServiceSupabaseClient();
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error && !error.message.toLowerCase().includes("user not found")) {
    throw new Error(`Failed to delete auth user ${userId}: ${error.message}`);
  }
}
