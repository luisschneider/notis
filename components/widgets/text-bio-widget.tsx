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
