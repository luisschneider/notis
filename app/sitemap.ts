import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  try {
    const supabase = await createClient();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("username, updated_at")
      .order("updated_at", { ascending: false });

    if (error || !profiles) {
      return staticRoutes;
    }

    const profileRoutes: MetadataRoute.Sitemap = profiles.map((profile) => ({
      url: `${siteUrl}/u/${profile.username}`,
      lastModified: profile.updated_at
        ? new Date(profile.updated_at as string)
        : new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    }));

    return [...staticRoutes, ...profileRoutes];
  } catch {
    return staticRoutes;
  }
}
