"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "./date-range-picker";
import { SignupsChart } from "./signups-chart";
import { BoardViewsChart } from "./board-views-chart";
import { fetchTimeSeriesData } from "@/app/admin/actions";
import type { DailyCount } from "@/lib/server/admin-data";

interface TimeSeriesSectionProps {
  initialSignups: DailyCount[];
  initialBoardViews: DailyCount[];
  initialFrom: string;
  initialTo: string;
}

export function TimeSeriesSection({
  initialSignups,
  initialBoardViews,
  initialFrom,
  initialTo,
}: TimeSeriesSectionProps): React.JSX.Element {
  const [signups, setSignups] = useState(initialSignups);
  const [boardViews, setBoardViews] = useState(initialBoardViews);
  const [isPending, startTransition] = useTransition();

  function handleDateChange(range: { from: Date; to: Date }): void {
    startTransition(async () => {
      const result = await fetchTimeSeriesData(
        range.from.toISOString(),
        range.to.toISOString(),
      );
      setSignups(result.signups);
      setBoardViews(result.boardViews);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity Over Time</h2>
        <DateRangePicker
          from={new Date(initialFrom)}
          to={new Date(initialTo)}
          onSelect={handleDateChange}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={isPending ? "opacity-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Signups Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <SignupsChart data={signups} />
          </CardContent>
        </Card>
        <Card className={isPending ? "opacity-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Board Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <BoardViewsChart data={boardViews} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
