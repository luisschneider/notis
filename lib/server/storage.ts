export const AVATAR_BUCKET_NAME = "avatars";

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function createAvatarStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const cleanedFileName = sanitizeFileName(fileName);
  return `${userId}/${timestamp}-${cleanedFileName}`;
}

export function getPublicAvatarUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }

  return `${supabaseUrl}/storage/v1/object/public/${AVATAR_BUCKET_NAME}/${path}`;
}
