"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DailyCount } from "@/lib/server/admin-data";

interface SignupsChartProps {
  data: DailyCount[];
}

const chartConfig: ChartConfig = {
  count: {
    label: "Signups",
    color: "var(--chart-1)",
  },
};

export function SignupsChart({ data }: SignupsChartProps): React.JSX.Element {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => {
            const d = new Date(String(value) + "T00:00:00");
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
          interval="preserveStartEnd"
        />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={30} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                const d = new Date(String(value) + "T00:00:00");
                return d.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });
              }}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
