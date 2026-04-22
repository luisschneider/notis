import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { BookOpen } from "lucide-react";
import { WidgetFrame } from "./widget-frame";

interface ReadingListWidgetProps {
  widget: WidgetInstanceRecord;
}

export function ReadingListWidget({ widget }: ReadingListWidgetProps): React.JSX.Element {
  const items = Array.isArray(widget.data.items)
    ? widget.data.items
    : Array.isArray(widget.data.entries)
      ? widget.data.entries
      : [];

  if (!items.length) {
    return (
      <WidgetFrame title="Reading List" description="Things worth reading">
        <p className="text-sm text-muted-foreground">No reading list items yet.</p>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame title="Reading List" description="Things worth reading">
      <ul className="space-y-3">
        {items.slice(0, 5).map((item, index) => {
          const record = item as Record<string, unknown>;
          const id =
            typeof record.id === "string"
              ? record.id
              : `reading-item-${index}`;
          const url =
            typeof record.url === "string" ? record.url : "";
          const title =
            typeof record.title === "string" ? record.title : "Untitled";
          const itemType =
            typeof record.item_type === "string"
              ? record.item_type
              : typeof record.type === "string"
                ? record.type
                : "other";
          const author =
            typeof record.author === "string" ? record.author : "";
          return (
          <li key={id} className="rounded-md border border-border/70 p-3">
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 size-4 text-muted-foreground" />
              <div className="min-w-0 space-y-1">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {title}
                  </a>
                ) : (
                  <p className="line-clamp-2 text-sm font-medium">{title}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {itemType}
                  {author ? ` • ${author}` : ""}
                </p>
              </div>
            </div>
          </li>
          );
        })}
      </ul>
    </WidgetFrame>
  );
}
