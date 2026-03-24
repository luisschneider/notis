import { WidgetSkeleton } from "@/components/widgets/widget-skeleton";

export default function DashboardLoading(): React.JSX.Element {
  return (
    <section className="space-y-4 pb-20 md:pb-6">
      <div className="space-y-1">
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <WidgetSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
