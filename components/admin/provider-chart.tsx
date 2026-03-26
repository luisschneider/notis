"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ProviderCount } from "@/lib/server/admin-data";

interface ProviderChartProps {
  data: ProviderCount[];
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ProviderChart({ data }: ProviderChartProps): React.JSX.Element {
  const chartConfig: ChartConfig = data.reduce<ChartConfig>((acc, item, i) => {
    acc[item.provider] = {
      label: item.provider.charAt(0).toUpperCase() + item.provider.slice(1),
      color: COLORS[i % COLORS.length] ?? "var(--chart-1)",
    };
    return acc;
  }, {});

  const chartData = data.map((item) => ({
    name: item.provider,
    value: item.count,
    fill: chartConfig[item.provider]?.color ?? "var(--chart-1)",
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No connected accounts yet
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto h-[300px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}
