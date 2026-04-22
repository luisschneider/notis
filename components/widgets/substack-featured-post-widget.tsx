import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface SubstackFeaturedPostWidgetProps {
  widget: WidgetInstanceRecord;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function SubstackFeaturedPostWidget({
  widget,
}: SubstackFeaturedPostWidgetProps): React.JSX.Element {
  const data = isRecord(widget.data) ? widget.data : {};
  const post = isRecord(data.post) ? data.post : {};
  const title = typeof post.title === "string" ? post.title : "Featured post";
  const url = typeof post.url === "string" ? post.url : null;
  const excerpt = typeof post.excerpt === "string" ? post.excerpt : "";

  return (
    <WidgetFrame title={typeof widget.config.title === "string" ? widget.config.title : "Featured Post"}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">
          {title}
        </a>
      ) : (
        <p className="text-sm font-medium">{title}</p>
      )}
      {excerpt ? <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{excerpt}</p> : null}
    </WidgetFrame>
  );
}
