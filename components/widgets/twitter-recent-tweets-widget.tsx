import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface TwitterRecentTweetsWidgetProps {
  widget: WidgetInstanceRecord;
}

export function TwitterRecentTweetsWidget({
  widget,
}: TwitterRecentTweetsWidgetProps): React.JSX.Element {
  const tweetUrls = Array.isArray(widget.data.tweetUrls)
    ? widget.data.tweetUrls
    : [];

  return (
    <WidgetFrame title="Recent Tweets">
      {tweetUrls.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add tweet URLs in this widget&apos;s config.
        </p>
      ) : (
        <ul className="space-y-2">
          {tweetUrls.slice(0, 5).map((url) => (
            <li key={url} className="rounded-md border p-2 text-sm">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-2 break-all hover:underline"
              >
                {url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
}
