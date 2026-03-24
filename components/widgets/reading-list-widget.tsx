import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { BookOpen } from "lucide-react";
import { WidgetFrame } from "./widget-frame";

interface ReadingListWidgetProps {
  widget: WidgetInstanceRecord;
}

export function ReadingListWidget({ widget }: ReadingListWidgetProps): React.JSX.Element {
  const items = Array.isArray(widget.data.items) ? widget.data.items : [];

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
        {items.slice(0, 5).map((item) => (
          <li key={item.id} className="rounded-md border border-border/70 p-3">
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 size-4 text-muted-foreground" />
              <div className="min-w-0 space-y-1">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {item.title}
                  </a>
                ) : (
                  <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {item.item_type}
                  {item.author ? ` • ${item.author}` : ""}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}
