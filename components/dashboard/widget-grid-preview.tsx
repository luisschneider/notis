"use client";

import { WIDGET_REGISTRY_MAP } from "@/lib/widgets/registry";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { cn } from "@/lib/utils";
import { WidgetRenderer } from "@/components/widgets/render-widget";

interface WidgetGridPreviewProps {
  widgets: WidgetInstanceRecord[];
  className?: string;
}

export function WidgetGridPreview({
  widgets,
  className,
}: WidgetGridPreviewProps): React.JSX.Element {
  const visibleWidgets = widgets
    .filter((widget) => widget.is_visible)
    .sort((a, b) => a.position - b.position);

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium">Live board preview</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:auto-rows-[150px] md:grid-flow-dense">
        {visibleWidgets.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">
            No visible widgets yet.
          </p>
        ) : (
          visibleWidgets.map((widget) => {
            const metadata = WIDGET_REGISTRY_MAP[widget.widget_type];
            if (!metadata) {
              return null;
            }

            return (
              <div
                key={widget.id}
                className="h-full min-h-[140px] md:min-h-0"
                style={{
                  gridColumn: `span ${metadata.gridWidth}`,
                  gridRow: `span ${metadata.gridHeight}`,
                }}
              >
                <WidgetRenderer widget={widget} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
