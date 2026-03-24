import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface TextQuoteWidgetProps {
  widget: WidgetInstanceRecord;
}

export function TextQuoteWidget({ widget }: TextQuoteWidgetProps): React.JSX.Element {
  const data = widget.data as { quote?: unknown; attribution?: unknown };
  const quote = typeof data.quote === "string" ? data.quote.trim() : "";
  const attribution =
    typeof data.attribution === "string" ? data.attribution.trim() : "";

  return (
    <WidgetFrame title="Quote">
      {quote ? (
        <blockquote className="space-y-2 text-sm italic">
          <p>&ldquo;{quote}&rdquo;</p>
          {attribution ? (
            <footer className="not-italic text-xs text-muted-foreground">
              — {attribution}
            </footer>
          ) : null}
        </blockquote>
      ) : (
        <p className="text-sm text-muted-foreground">No quote yet.</p>
      )}
    </WidgetFrame>
  );
}
