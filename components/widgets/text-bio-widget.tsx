import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface TextBioWidgetProps {
  widget: WidgetInstanceRecord;
}

export function TextBioWidget({ widget }: TextBioWidgetProps): React.JSX.Element {
  const title =
    typeof widget.config.title === "string" && widget.config.title.trim()
      ? widget.config.title
      : "About me";
  const markdown =
    typeof widget.data.markdown === "string" ? widget.data.markdown : "";

  return (
    <WidgetFrame title={title}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {markdown || "No bio content yet."}
      </p>
    </WidgetFrame>
  );
}

interface TextLinksWidgetProps {
  widget: WidgetInstanceRecord;
}

export function TextLinksWidget({ widget }: TextLinksWidgetProps): React.JSX.Element {
  const title =
    typeof widget.config.title === "string" && widget.config.title.trim()
      ? widget.config.title
      : "Links";
  const links = Array.isArray(widget.data.links)
    ? widget.data.links
        .map((item) => {
          if (typeof item !== "object" || item === null) {
            return null;
          }
          const entry = item as Record<string, unknown>;
          const label =
            typeof entry.label === "string" && entry.label.trim()
              ? entry.label.trim()
              : null;
          const url =
            typeof entry.url === "string" && entry.url.trim()
              ? entry.url.trim()
              : null;
          if (!label || !url) {
            return null;
          }
          return { label, url };
        })
        .filter((item): item is { label: string; url: string } => item !== null)
    : [];

  return (
    <WidgetFrame title={title}>
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links added yet.</p>
      ) : (
        <ul className="space-y-2">
          {links.slice(0, 8).map((link) => (
            <li key={`${link.url}-${link.label}`} className="rounded-md border p-2 text-sm">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium hover:underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
}

interface TextQuoteWidgetProps {
  widget: WidgetInstanceRecord;
}

export function TextQuoteWidget({ widget }: TextQuoteWidgetProps): React.JSX.Element {
  const quote = typeof widget.data.quote === "string" ? widget.data.quote.trim() : "";
  const attribution =
    typeof widget.data.attribution === "string" ? widget.data.attribution.trim() : "";

  return (
    <WidgetFrame title="Quote">
      {quote ? (
        <blockquote className="space-y-2">
          <p className="text-sm italic text-muted-foreground">“{quote}”</p>
          {attribution ? (
            <footer className="text-xs text-muted-foreground">— {attribution}</footer>
          ) : null}
        </blockquote>
      ) : (
        <p className="text-sm text-muted-foreground">No quote set yet.</p>
      )}
    </WidgetFrame>
  );
}
