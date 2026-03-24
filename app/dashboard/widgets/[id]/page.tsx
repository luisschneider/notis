import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWidgetInstanceById } from "@/lib/server/widgets";
import { WIDGET_REGISTRY_MAP } from "@/lib/widgets/registry";
import { isWidgetType } from "@/lib/widgets/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  const widget = await getWidgetInstanceById(id, user.id);
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
        <CardHeader>
          <CardTitle>{registry.displayName} settings</CardTitle>
          <CardDescription>
            Configuration UI for this widget will be expanded in provider phases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Widget type: {widget.widget_type}</p>
          <p>Provider: {registry.provider}</p>
          <p>
            Grid size: {registry.gridWidth}×{registry.gridHeight}
          </p>
          <p>
            This placeholder page confirms routing and instance-level settings access required for
            Phase 2.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
