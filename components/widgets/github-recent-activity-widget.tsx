import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface GitHubRecentActivityWidgetProps {
  widget: WidgetInstanceRecord;
}

export function GitHubRecentActivityWidget({
  widget,
}: GitHubRecentActivityWidgetProps): React.JSX.Element {
  const events = Array.isArray(widget.data.events)
    ? widget.data.events
    : Array.isArray(widget.data.items)
      ? widget.data.items
      : [];

  return (
    <WidgetFrame title="GitHub Activity">
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity synced yet.</p>
      ) : (
        <ul className="space-y-2">
          {events.slice(0, 5).map((event, index) => {
            const item = event as Record<string, unknown>;
            const repo =
              typeof item.repo === "string" ? item.repo : "Unknown repository";
            const createdAt =
              typeof item.createdAt === "string"
                ? item.createdAt
                : typeof item.created_at === "string"
                  ? item.created_at
                  : "unknown";
            const summary =
              typeof item.summary === "string"
                ? item.summary
                : typeof item.type === "string"
                  ? item.type
                  : "Activity";
            return (
            <li key={`${repo}-${createdAt}-${index}`} className="rounded border p-2">
              <p className="text-sm font-medium">{summary}</p>
              <p className="text-xs text-muted-foreground">{repo}</p>
            </li>
            );
          })}
        </ul>
      )}
    </WidgetFrame>
  );
}
