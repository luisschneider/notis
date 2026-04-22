import { createCipheriv, createDecipheriv, createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { ConnectedAccountRow } from "@/lib/supabase/types";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function getTokenEncryptionKey(): string {
  const value = process.env.TOKEN_ENCRYPTION_KEY;
  if (!value) {
    throw new Error("Missing TOKEN_ENCRYPTION_KEY environment variable.");
  }
  return value;
}

function deriveEncryptionKey(keyMaterial: string): Buffer {
  return createHash("sha256").update(keyMaterial).digest();
}

export function encryptToken(plainToken: string): string {
  const key = deriveEncryptionKey(getTokenEncryptionKey());
  const iv = Buffer.from(
    createHash("sha256").update(`${plainToken}:${Date.now()}:${Math.random()}`).digest("hex").slice(0, 24),
    "hex",
  );
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainToken, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decryptToken(encryptedToken: string): string {
  const payload = Buffer.from(encryptedToken, "base64url");
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const key = deriveEncryptionKey(getTokenEncryptionKey());
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function isTokenExpiringSoon(
  expiresAt: string | null,
  thresholdMinutes: number,
): boolean {
  if (!expiresAt) {
    return false;
  }
  const expiration = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiration)) {
    return false;
  }
  const thresholdMs = thresholdMinutes * 60 * 1000;
  return expiration <= Date.now() + thresholdMs;
}

export async function listConnectedAccountsByUserId(
  userId: string,
): Promise<ConnectedAccountRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("provider", { ascending: true });

  if (error) {
    throw new Error(`Failed to list connected accounts: ${error.message}`);
  }

  return (data ?? []) as ConnectedAccountRow[];
}

export async function getConnectedAccountByProvider(
  userId: string,
  provider: ConnectedAccountRow["provider"],
): Promise<ConnectedAccountRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch connected account: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as ConnectedAccountRow;
}

export async function upsertConnectedAccount(
  input: Omit<ConnectedAccountRow, "id" | "created_at">,
): Promise<ConnectedAccountRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .upsert(input, {
      onConflict: "user_id,provider",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save connected account: ${error?.message ?? "Unknown error"}`);
  }

  return data as ConnectedAccountRow;
}

export async function deleteConnectedAccountByProvider(
  userId: string,
  provider: ConnectedAccountRow["provider"],
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("connected_accounts")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    throw new Error(`Failed to disconnect provider: ${error.message}`);
  }
}

export async function decryptProviderToken(encryptedToken: string): Promise<string> {
  return decryptToken(encryptedToken);
}

interface OAuthStateInput {
  userId: string;
  provider: ConnectedAccountRow["provider"];
  nextPath: string;
}

export function createOAuthState(input: OAuthStateInput): string {
  const raw = `${input.userId}:${input.provider}:${input.nextPath}:${Date.now()}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}
