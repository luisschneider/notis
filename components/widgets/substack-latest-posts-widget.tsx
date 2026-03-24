import { formatDistanceToNowStrict } from "date-fns";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

function toRelativeTime(dateIso: string | null | undefined): string {
  if (!dateIso) {
    return "unknown";
  }

  const parsedDate = new Date(dateIso);
  if (Number.isNaN(parsedDate.getTime())) {
    return "unknown";
  }

  return `${formatDistanceToNowStrict(parsedDate)} ago`;
}

interface SubstackLatestPostsWidgetProps {
  widget: WidgetInstanceRecord;
}

export function SubstackLatestPostsWidget({
  widget,
}: SubstackLatestPostsWidgetProps): React.JSX.Element {
  const posts = Array.isArray(widget.data.posts) ? widget.data.posts : [];
  const publication =
    typeof widget.config.publication === "string"
      ? widget.config.publication
      : "";

  return (
    <WidgetFrame
      title="Substack Latest Posts"
      subtitle={publication ? `${publication}.substack.com` : undefined}
    >
      <ul className="space-y-3">
        {posts.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            No Substack posts synced yet.
          </li>
        ) : null}
        {posts.slice(0, 3).map((post, index) => {
          const item = post as Record<string, unknown>;
          const url =
            typeof item.url === "string" && item.url.trim()
              ? item.url
              : "#";
          const title =
            typeof item.title === "string" && item.title.trim()
              ? item.title
              : "Untitled post";
          const publishedAt =
            typeof item.publishedAt === "string" ? item.publishedAt : null;
          return (
          <li
            className="rounded-md border border-border/70 bg-background/80 p-3"
            key={`${url}-${index}`}
          >
            <a
              className="line-clamp-2 text-sm font-medium hover:underline"
              href={url}
              rel="noreferrer"
              target="_blank"
            >
              {title}
            </a>
            <p className="mt-1 text-xs text-muted-foreground">
              {toRelativeTime(publishedAt)}
            </p>
          </li>
          );
        })}
      </ul>
    </WidgetFrame>
  );
}
