import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface TextLinksWidgetProps {
  widget: WidgetInstanceRecord;
}

export function TextLinksWidget({ widget }: TextLinksWidgetProps): React.JSX.Element {
  const title =
    typeof widget.config.title === "string" && widget.config.title.trim()
      ? widget.config.title
      : "Links";

  const linksRaw = widget.data.links;
  const links = Array.isArray(linksRaw)
    ? linksRaw.filter((link): link is { label: string; url: string } => {
        return (
          typeof link === "object" &&
          link !== null &&
          typeof (link as { label?: unknown }).label === "string" &&
          typeof (link as { url?: unknown }).url === "string"
        );
      })
    : [];

  return (
    <WidgetFrame title={title}>
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links added yet.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={`${link.label}-${link.url}`} className="rounded-md border p-2">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium hover:underline"
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
