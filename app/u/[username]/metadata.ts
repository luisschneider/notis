import type { Metadata } from "next";
import { getProfileByUsername } from "@/lib/server/profiles";

export async function generatePublicProfileMetadata(
  username: string,
): Promise<Metadata> {
  const normalizedUsername = username.toLowerCase();
  const path = `/u/${normalizedUsername}`;
  const imagePath = `${path}/opengraph-image`;
  const profile = await getProfileByUsername(normalizedUsername);

  if (!profile) {
    return {
      title: `@${normalizedUsername} · Notis`,
      description: "Personal digital notice board.",
      alternates: {
        canonical: path,
      },
      openGraph: {
        title: `@${normalizedUsername} · Notis`,
        description: "Personal digital notice board.",
        url: path,
        type: "profile",
        images: [
          { url: imagePath, width: 1200, height: 630, alt: `@${normalizedUsername} public board` },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `@${normalizedUsername} · Notis`,
        description: "Personal digital notice board.",
        images: [imagePath],
      },
    };
  }

  const displayName = profile.display_name || profile.username;
  const description = profile.bio || `${displayName}'s Notis board.`;
  const canonicalPath = `/u/${profile.username}`;

  return {
    title: `${displayName}`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${displayName} — Notis`,
      description,
      url: canonicalPath,
      type: "profile",
      siteName: "Notis",
      images: [{ url: imagePath, width: 1200, height: 630, alt: `${displayName} public board` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} · Notis`,
      description,
      images: [imagePath],
    },
  };
}
