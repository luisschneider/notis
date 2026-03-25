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

function toProfileRecord(row: unknown): ProfileRecord {
  const value = row as ProfileRowCompat;
  const displayName =
    typeof value.display_name === "string"
      ? value.display_name
      : typeof value.displayName === "string"
        ? value.displayName
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

async function insertProfileWithCompatibleDisplayNameColumn(
  userId: string,
  username: string,
  displayName: string,
): Promise<ProfileRecord | null> {
  const supabase = await createClient();
  const snakeCaseInsert = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username,
      display_name: displayName,
    })
    .select("*")
    .maybeSingle();

  if (!snakeCaseInsert.error && snakeCaseInsert.data) {
    return toProfileRecord(snakeCaseInsert.data);
  }

  if (!isMissingColumnError(snakeCaseInsert.error?.code)) {
    if (snakeCaseInsert.error?.code === "23505") {
      return null;
    }
    throw new Error(
      `Failed to create missing profile: ${snakeCaseInsert.error?.message ?? "Unknown error"}`,
    );
  }

  const camelCaseInsert = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username,
      displayName,
    })
    .select("*")
    .maybeSingle();

  if (!camelCaseInsert.error && camelCaseInsert.data) {
    return toProfileRecord(camelCaseInsert.data);
  }

  if (camelCaseInsert.error?.code === "23505") {
    return null;
  }

  throw new Error(
    `Failed to create missing profile: ${camelCaseInsert.error?.message ?? "Unknown error"}`,
  );
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
  const snakeCaseUpdate = await supabase
    .from("profiles")
    .update({
      username: payload.username,
      display_name: payload.displayName,
      bio: payload.bio,
      avatar_url: payload.avatarUrl,
    })
    .eq("id", userId);

  if (!snakeCaseUpdate.error) {
    return;
  }

  if (!isMissingColumnError(snakeCaseUpdate.error.code)) {
    throw new Error(`Failed to update profile: ${snakeCaseUpdate.error.message}`);
  }

  const camelCaseUpdate = await supabase
    .from("profiles")
    .update({
      username: payload.username,
      displayName: payload.displayName,
      bio: payload.bio,
      avatarUrl: payload.avatarUrl,
    })
    .eq("id", userId);

  if (camelCaseUpdate.error) {
    throw new Error(`Failed to update profile: ${camelCaseUpdate.error.message}`);
  }
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

  const candidates = [requestedUsername, emailLocalPart, fallbackUsername].filter(
    (candidate, index, array) =>
      candidate.length >= 3 && USERNAME_REGEX.test(candidate) && array.indexOf(candidate) === index,
  );

  const displayName =
    typeof user.user_metadata.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";

  for (const username of candidates) {
    const insertedProfile = await insertProfileWithCompatibleDisplayNameColumn(
      user.id,
      username,
      displayName,
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

