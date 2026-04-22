import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWidgetInstanceById } from "@/lib/server/widgets";
import { WIDGET_REGISTRY_MAP } from "@/lib/widgets/registry";
import { isWidgetType } from "@/lib/widgets/types";
import { WidgetSettingsPageClient } from "@/components/widgets/settings/widget-settings-page-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WidgetSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function WidgetSettingsPage({
  params,
}: WidgetSettingsPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const widget = await getWidgetInstanceById(user.id, id);
  if (!widget) {
    notFound();
  }

  if (!isWidgetType(widget.widget_type)) {
    notFound();
  }

  const registry = WIDGET_REGISTRY_MAP[widget.widget_type];
  if (!registry) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Button asChild variant="ghost" className="pl-0 text-muted-foreground">
        <Link href="/dashboard/widgets">
          <ArrowLeft className="mr-2 size-4" />
          Back to widgets
        </Link>
      </Button>

      <Card>
        <CardContent className="pt-6">
          <WidgetSettingsPageClient initialWidget={widget} />
        </CardContent>
      </Card>
    </section>
  );
}
