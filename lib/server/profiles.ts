import { createClient } from "@/lib/supabase/server";
import { USERNAME_REGEX, isUsernameValid } from "@/lib/validation/auth";

export interface ProfileUpdateInput {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}

export interface UsernameAvailability {
  available: boolean;
  reason?: string;
}

export interface ProfileRecord {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileRowCompat {
  id: string;
  username: string;
  display_name?: string | null;
  displayName?: string | null;
  name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

function sanitizeUsernameCandidate(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
}

function getIdBasedUsername(userId: string): string {
  const compactId = userId.replace(/-/g, "").slice(0, 12);
  return `user_${compactId}`;
}

function toLegacyCompatibleUsername(username: string): string {
  return username.replace(/-/g, "_").slice(0, 20);
}

function toProfileRecord(row: unknown): ProfileRecord {
  const value = row as ProfileRowCompat;
  const displayName =
    typeof value.display_name === "string"
      ? value.display_name
      : typeof value.displayName === "string"
        ? value.displayName
        : typeof value.name === "string"
          ? value.name
        : "";
  const bio = typeof value.bio === "string" ? value.bio : null;
  const avatarUrl =
    typeof value.avatar_url === "string"
      ? value.avatar_url
      : typeof value.avatarUrl === "string"
        ? value.avatarUrl
        : null;
  const createdAt =
    typeof value.created_at === "string"
      ? value.created_at
      : typeof value.createdAt === "string"
        ? value.createdAt
        : new Date(0).toISOString();
  const updatedAt =
    typeof value.updated_at === "string"
      ? value.updated_at
      : typeof value.updatedAt === "string"
        ? value.updatedAt
        : createdAt;

  return {
    id: value.id,
    username: value.username,
    display_name: displayName,
    bio,
    avatar_url: avatarUrl,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function isMissingColumnError(errorCode: string | undefined): boolean {
  return errorCode === "42703";
}

interface ProfileInsertPayload {
  id: string;
  username: string;
  display_name?: string;
  displayName?: string;
  email?: string;
  name?: string;
}

interface ProfileUpdatePayload {
  username: string;
  display_name?: string;
  displayName?: string;
  bio: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  name?: string;
}

function buildProfileInsertPayloads(
  userId: string,
  username: string,
  displayName: string,
  email: string,
): ProfileInsertPayload[] {
  const normalizedDisplayName = displayName || username;
  return [
    {
      id: userId,
      username,
      display_name: normalizedDisplayName,
      email,
      name: normalizedDisplayName,
    },
    {
      id: userId,
      username,
      displayName: normalizedDisplayName,
      email,
      name: normalizedDisplayName,
    },
    { id: userId, username, display_name: normalizedDisplayName, name: normalizedDisplayName },
    { id: userId, username, displayName: normalizedDisplayName, name: normalizedDisplayName },
    { id: userId, username, display_name: normalizedDisplayName, email },
    { id: userId, username, displayName: normalizedDisplayName, email },
    { id: userId, username, display_name: normalizedDisplayName },
    { id: userId, username, displayName: normalizedDisplayName },
  ];
}

function buildProfileUpdatePayloads(payload: {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}): ProfileUpdatePayload[] {
  const normalizedDisplayName = payload.displayName || payload.username;
  return [
    {
      username: payload.username,
      display_name: normalizedDisplayName,
      bio: payload.bio,
      avatar_url: payload.avatarUrl,
      name: normalizedDisplayName,
    },
    {
      username: payload.username,
      displayName: normalizedDisplayName,
      bio: payload.bio,
      avatarUrl: payload.avatarUrl,
      name: normalizedDisplayName,
    },
    {
      username: payload.username,
      display_name: normalizedDisplayName,
      bio: payload.bio,
      avatar_url: payload.avatarUrl,
    },
    {
      username: payload.username,
      displayName: normalizedDisplayName,
      bio: payload.bio,
      avatarUrl: payload.avatarUrl,
    },
  ];
}

async function insertProfileWithCompatibleDisplayNameColumn(
  userId: string,
  username: string,
  displayName: string,
  email: string,
): Promise<ProfileRecord | null> {
  const supabase = await createClient();
  const attempts = buildProfileInsertPayloads(userId, username, displayName, email);

  for (const attempt of attempts) {
    const insertResult = await supabase
      .from("profiles")
      .insert(attempt)
      .select("*")
      .maybeSingle();

    if (!insertResult.error && insertResult.data) {
      return toProfileRecord(insertResult.data);
    }

    if (insertResult.error?.code === "23505") {
      return null;
    }

    // Try the next payload when column naming/requirements differ across environments.
    if (
      isMissingColumnError(insertResult.error?.code) ||
      insertResult.error?.code === "23502"
    ) {
      continue;
    }

    throw new Error(
      `Failed to create missing profile: ${insertResult.error?.message ?? "Unknown error"}`,
    );
  }
  return null;
}

async function updateProfileWithCompatibleDisplayNameColumn(
  userId: string,
  payload: {
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
  },
): Promise<void> {
  const supabase = await createClient();
  const attempts = buildProfileUpdatePayloads(payload);

  for (const attempt of attempts) {
    const updateResult = await supabase.from("profiles").update(attempt).eq("id", userId);
    if (!updateResult.error) {
      return;
    }
    if (
      isMissingColumnError(updateResult.error.code) ||
      updateResult.error.code === "23502"
    ) {
      continue;
    }
    throw new Error(`Failed to update profile: ${updateResult.error.message}`);
  }

  throw new Error("Failed to update profile: no compatible profile column mapping found.");
}

export async function getProfileByUserId(userId: string): Promise<ProfileRecord> {
  const supabase = await createClient();
  const selectQuery = supabase
    .from("profiles")
    .select("*")
    .eq("id", userId);

  const { data: existingProfile, error: profileLookupError } = await selectQuery.maybeSingle();

  if (profileLookupError) {
    throw new Error(`Failed to fetch profile: ${profileLookupError.message}`);
  }

  if (existingProfile) {
    return toProfileRecord(existingProfile);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || user.id !== userId) {
    throw new Error("Profile not found.");
  }

  const requestedUsername =
    typeof user.user_metadata.username === "string"
      ? sanitizeUsernameCandidate(user.user_metadata.username)
      : "";
  const emailLocalPart =
    typeof user.email === "string" ? sanitizeUsernameCandidate(user.email.split("@")[0] ?? "") : "";
  const fallbackUsername = getIdBasedUsername(user.id);
  const legacyRequestedUsername = toLegacyCompatibleUsername(requestedUsername);
  const legacyEmailLocalPart = toLegacyCompatibleUsername(emailLocalPart);
  const legacyFallbackUsername = toLegacyCompatibleUsername(fallbackUsername);

  const candidates = [
    requestedUsername,
    emailLocalPart,
    fallbackUsername,
    legacyRequestedUsername,
    legacyEmailLocalPart,
    legacyFallbackUsername,
  ].filter(
    (candidate, index, array) =>
      candidate.length >= 3 && USERNAME_REGEX.test(candidate) && array.indexOf(candidate) === index,
  );

  const displayName =
    typeof user.user_metadata.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";
  const email =
    typeof user.email === "string" && user.email.trim().length > 0
      ? user.email.trim()
      : `${user.id}@notis.local`;

  for (const username of candidates) {
    const insertedProfile = await insertProfileWithCompatibleDisplayNameColumn(
      user.id,
      username,
      displayName,
      email,
    );
    if (insertedProfile) {
      return insertedProfile;
    }

    const { data: racedProfile, error: racedProfileError } = await selectQuery.maybeSingle();
    if (racedProfileError) {
      throw new Error(`Failed to recover missing profile: ${racedProfileError.message}`);
    }
    if (racedProfile) {
      return toProfileRecord(racedProfile);
    }
  }

  throw new Error("Profile not found.");
}

export async function getProfileByUsername(username: string): Promise<ProfileRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch profile by username: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return toProfileRecord(data);
}

export async function checkUsernameAvailability(
  username: string,
  excludeUserId?: string,
): Promise<UsernameAvailability> {
  const normalizedUsername = username.toLowerCase().trim();

  if (!isUsernameValid(normalizedUsername)) {
    return {
      available: false,
      reason:
        "Username must be 3-30 chars and use only lowercase letters, numbers, underscores, and dashes.",
    };
  }

  const supabase = await createClient();
  const query = supabase
    .from("profiles")
    .select("id")
    .eq("username", normalizedUsername)
    .limit(1);

  if (excludeUserId) {
    query.neq("id", excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not check username: ${error.message}`);
  }

  return {
    available: data.length === 0,
  };
}

export async function updateCurrentUserProfile(
  input: ProfileUpdateInput,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const normalizedUsername = input.username.toLowerCase().trim();

  if (!USERNAME_REGEX.test(normalizedUsername)) {
    throw new Error("Invalid username format.");
  }

  const availability = await checkUsernameAvailability(normalizedUsername, user.id);

  if (!availability.available) {
    throw new Error(availability.reason ?? "Username is already taken.");
  }

  await updateProfileWithCompatibleDisplayNameColumn(user.id, {
    username: normalizedUsername,
    displayName: input.displayName.trim(),
    bio: input.bio.trim() || null,
    avatarUrl: input.avatarUrl,
  });
}

