import { WidgetFrame } from "./widget-frame";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";

interface GithubContributionGraphWidgetProps {
  widget: WidgetInstanceRecord;
}

interface ContributionDay {
  date: string;
  count: number;
}

function asContributionDays(value: unknown): ContributionDay[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const days: ContributionDay[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const date = "date" in item && typeof item.date === "string" ? item.date : "";
    const count = "count" in item && typeof item.count === "number" ? item.count : 0;
    if (date) {
      days.push({ date, count });
    }
  }
  return days;
}

function levelClass(count: number): string {
  if (count >= 8) {
    return "bg-emerald-500";
  }
  if (count >= 4) {
    return "bg-emerald-400";
  }
  if (count >= 1) {
    return "bg-emerald-300";
  }
  return "bg-muted";
}

export function GithubContributionGraphWidget({
  widget,
}: GithubContributionGraphWidgetProps): React.JSX.Element {
  const days = asContributionDays(widget.data.days).slice(-35);
  return (
    <WidgetFrame title="Contribution Graph">
      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contribution data synced yet.</p>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => (
            <div
              key={day.date}
              className={`h-4 rounded-sm ${levelClass(day.count)}`}
              title={`${day.date}: ${day.count} contributions`}
            />
          ))}
        </div>
      )}
    </WidgetFrame>
  );
}
