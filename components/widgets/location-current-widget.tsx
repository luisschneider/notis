"use client";

import { MapPin } from "lucide-react";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface LocationCurrentWidgetProps {
  widget: WidgetInstanceRecord;
}

export function LocationCurrentWidget({ widget }: LocationCurrentWidgetProps): React.JSX.Element {
  const config = widget.config;
  const location =
    typeof config.location === "string" ? config.location.trim() : "Unknown location";
  const countryCode = typeof config.country_code === "string" ? config.country_code.trim().toUpperCase() : "";

  const flag =
    countryCode.length === 2
      ? String.fromCodePoint(
          ...countryCode
            .split("")
            .map((char) => 127397 + char.charCodeAt(0)),
        )
      : "";

  return (
    <WidgetFrame title="Current Location">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="size-4 text-foreground" />
        <span className="font-medium text-foreground">{location}</span>
        {flag ? <span>{flag}</span> : null}
      </div>
    </WidgetFrame>
  );
}
