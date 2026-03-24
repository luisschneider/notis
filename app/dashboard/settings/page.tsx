import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/server/profiles";

export default async function DashboardSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileByUserId(user.id);

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Profile settings</h1>
        <p className="text-sm text-muted-foreground">
          Update your public profile shown on your Notis board.
        </p>
      </div>
      <SettingsForm
        initialProfile={{
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        }}
      />
    </section>
  );
}

