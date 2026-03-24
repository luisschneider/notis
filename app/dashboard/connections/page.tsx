import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listConnectedAccountsByUserId } from "@/lib/providers/oauth";
import { ConnectionCard } from "@/components/dashboard/connection-card";

export default async function DashboardConnectionsPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accounts = await listConnectedAccountsByUserId(user.id);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Connections</h1>
      <p className="text-sm text-muted-foreground">
        Manage OAuth providers used by provider-backed widgets.
      </p>
      <ConnectionCard accounts={accounts} />
    </section>
  );
}
