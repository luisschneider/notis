import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface TwitterPinnedTweetWidgetProps {
  widget: WidgetInstanceRecord;
}

export function TwitterPinnedTweetWidget({
  widget,
}: TwitterPinnedTweetWidgetProps): React.JSX.Element {
  const pinnedUrl =
    typeof widget.data.pinnedUrl === "string" && widget.data.pinnedUrl.trim()
      ? widget.data.pinnedUrl
      : typeof widget.config.pinnedTweetUrl === "string" &&
          widget.config.pinnedTweetUrl.trim()
        ? widget.config.pinnedTweetUrl
        : null;

  return (
    <WidgetFrame title="Pinned Tweet">
      {!pinnedUrl ? (
        <p className="text-sm text-muted-foreground">
          Add one tweet URL to feature a pinned post.
        </p>
      ) : (
        <a
          href={pinnedUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-md border p-3 text-sm break-all hover:underline"
        >
          {pinnedUrl}
        </a>
      )}
    </WidgetFrame>
  );
}
