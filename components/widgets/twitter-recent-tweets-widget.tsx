import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface TwitterRecentTweetsWidgetProps {
  widget: WidgetInstanceRecord;
}

export function TwitterRecentTweetsWidget({
  widget,
}: TwitterRecentTweetsWidgetProps): React.JSX.Element {
  const tweetUrls = Array.isArray(widget.data.tweets)
    ? widget.data.tweets
    : Array.isArray(widget.data.tweetUrls)
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
          {tweetUrls.slice(0, 5).map((tweet, index) => {
            const tweetRecord = tweet as Record<string, unknown>;
            const url =
              typeof tweetRecord.url === "string"
                ? tweetRecord.url
                : typeof tweet === "string"
                  ? tweet
                  : "";
            const text =
              typeof tweetRecord.text === "string"
                ? tweetRecord.text
                : url;
            const author =
              typeof tweetRecord.authorHandle === "string"
                ? tweetRecord.authorHandle
                : "";
            return (
            <li key={`${url}-${index}`} className="rounded-md border p-2 text-sm">
              {author ? <p className="mb-1 text-xs text-muted-foreground">@{author}</p> : null}
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-2 break-all hover:underline"
              >
                {text}
              </a>
            </li>
            );
          })}
        </ul>
      )}
    </WidgetFrame>
  );
}
