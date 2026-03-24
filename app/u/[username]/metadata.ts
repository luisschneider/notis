import type { Metadata } from "next";
import { getProfileByUsername } from "@/lib/server/profiles";

export async function generatePublicProfileMetadata(
  username: string,
): Promise<Metadata> {
  const profile = await getProfileByUsername(username.toLowerCase());
  if (!profile) {
    return {
      title: "Notis",
      description: "Personal digital notice board.",
    };
  }

  const displayName = profile.display_name || profile.username;
  const description = profile.bio || `${displayName}'s Notis board.`;
  const path = `/u/${profile.username}`;

  return {
    title: `${displayName} · Notis`,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${displayName} · Notis`,
      description,
      url: path,
      type: "profile",
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${displayName} · Notis`,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
  };
}
