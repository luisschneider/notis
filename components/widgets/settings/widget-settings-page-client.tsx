"use client";

import { useState } from "react";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetSettingsRenderer } from "./widget-settings-renderer";

interface WidgetSettingsPageClientProps {
  initialWidget: WidgetInstanceRecord;
}

export function WidgetSettingsPageClient({
  initialWidget,
}: WidgetSettingsPageClientProps): React.JSX.Element {
  const [widget, setWidget] = useState<WidgetInstanceRecord>(initialWidget);
  return <WidgetSettingsRenderer widget={widget} onSaved={setWidget} />;
}
