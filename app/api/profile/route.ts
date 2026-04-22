import { createClient } from "@/lib/supabase/server";
import { createAvatarStoragePath, getPublicAvatarUrl } from "@/lib/server/storage";
import { profileUpdateSchema } from "@/lib/validation/auth";
import { NextResponse } from "next/server";

interface ProfilePayload {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileResponseBody {
  profile?: ProfilePayload;
  avatarUrl?: string;
  error?: string;
}

async function ensureAvatarBucketExists(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const endpoint = `${supabaseUrl}/storage/v1/bucket/avatars`;
  const headers = {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    "Content-Type": "application/json",
  };

  const existsResponse = await fetch(endpoint, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (existsResponse.status === 200) {
    return;
  }

  await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: "avatars",
      name: "avatars",
      public: true,
      file_size_limit: 4 * 1024 * 1024,
      allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    }),
    cache: "no-store",
  });
}

export async function GET(): Promise<NextResponse<ProfileResponseBody>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ profile }, { status: 200 });
}

export async function PATCH(request: Request): Promise<NextResponse<ProfileResponseBody>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    username: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
  };
  try {
    const json = (await request.json()) as unknown;
    payload = profileUpdateSchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid profile payload." }, { status: 400 });
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", user.id)
    .single();

  if (existingProfileError || !existingProfile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  if (payload.username !== existingProfile.username) {
    const { data: usernameOwner, error: usernameError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", payload.username)
      .maybeSingle();

    if (usernameError) {
      return NextResponse.json({ error: usernameError.message }, { status: 400 });
    }

    if (usernameOwner && usernameOwner.id !== user.id) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 },
      );
    }
  }

  const updatePayload = {
    username: payload.username,
    display_name: payload.display_name,
    bio: payload.bio,
    avatar_url: payload.avatar_url,
  };

  const { data: profile, error: updateError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id)
    .select("id, username, display_name, bio, avatar_url, created_at, updated_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ profile }, { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse<ProfileResponseBody>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing avatar file." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Avatar must be an image." }, { status: 400 });
  }

  const maxBytes = 4 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "Avatar must be 4MB or smaller." }, { status: 400 });
  }

  const path = createAvatarStoragePath(user.id, file.name);
  await ensureAvatarBucketExists();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  let avatarUrl: string;
  try {
    avatarUrl = getPublicAvatarUrl(path);
  } catch {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL environment variable." },
      { status: 500 },
    );
  }

  return NextResponse.json({ avatarUrl }, { status: 200 });
}
