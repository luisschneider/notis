"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DailyViewCount, ReferrerCount } from "@/lib/server/analytics";

const viewsChartConfig = {
  views: {
    label: "Views",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface ViewsOverTimeChartProps {
  data: DailyViewCount[];
}

export function ViewsOverTimeChart({ data }: ViewsOverTimeChartProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Views Over Time</CardTitle>
        <CardDescription>Daily page views for the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={viewsChartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12, top: 4 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const dateStr = typeof value === "string" ? value : String(value);
                    return new Date(dateStr).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <defs>
              <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-views)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="views"
              type="monotone"
              fill="url(#fillViews)"
              stroke="var(--color-views)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

interface TopReferrersTableProps {
  data: ReferrerCount[];
}

export function TopReferrersTable({ data }: TopReferrersTableProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Referrers</CardTitle>
        <CardDescription>Where your visitors are coming from</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No referrer data yet.</p>
        ) : (
          <div className="space-y-3">
            {data.map((item) => {
              const maxCount = data[0]?.count ?? 1;
              const percentage = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.referrer} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{item.referrer}</span>
                    <span className="ml-2 shrink-0 text-muted-foreground">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
