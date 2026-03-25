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

function sanitizeUsernameCandidate(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
}

function getIdBasedUsername(userId: string): string {
  const compactId = userId.replace(/-/g, "").slice(0, 12);
  return `user_${compactId}`;
}

function toProfileRecord(row: unknown): ProfileRecord {
  return row as ProfileRecord;
}

export async function getProfileByUserId(userId: string): Promise<ProfileRecord> {
  const supabase = await createClient();
  const selectQuery = supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at, updated_at")
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
    const { data: insertedProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username,
        display_name: displayName,
      })
      .select("id, username, display_name, bio, avatar_url, created_at, updated_at")
      .maybeSingle();

    if (!insertError && insertedProfile) {
      return toProfileRecord(insertedProfile);
    }

    if (insertError?.code !== "23505") {
      throw new Error(`Failed to create missing profile: ${insertError?.message ?? "Unknown error"}`);
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
    .select("id, username, display_name, bio, avatar_url, created_at, updated_at")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch profile by username: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as ProfileRecord;
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

  const { error } = await supabase
    .from("profiles")
    .update({
      username: normalizedUsername,
      display_name: input.displayName.trim(),
      bio: input.bio.trim() || null,
      avatar_url: input.avatarUrl,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

