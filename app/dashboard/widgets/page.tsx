import { redirect } from "next/navigation";
import { WidgetManager } from "@/components/dashboard/widget-manager";
import { createClient } from "@/lib/supabase/server";
import { listWidgetInstancesByUserId } from "@/lib/server/widgets";

export default async function DashboardWidgetsPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const widgetInstances = await listWidgetInstancesByUserId(user.id);

  return (
    <section className="space-y-4 pb-20 md:pb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Manage widgets</h1>
        <p className="text-sm text-muted-foreground">
          Add, reorder, hide, and remove the blocks on your public board.
        </p>
      </div>
      <WidgetManager initialWidgets={widgetInstances} />
    </section>
  );
}
