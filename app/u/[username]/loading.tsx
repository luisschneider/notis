import { WidgetSkeleton } from "@/components/widgets/widget-skeleton";

export default function PublicBoardLoading(): React.JSX.Element {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-col items-center gap-4 text-center md:items-start md:text-left">
        <div className="size-20 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
      </header>
      <section className="space-y-4 md:hidden">
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
      </section>
      <section className="hidden grid-cols-2 gap-4 md:grid md:auto-rows-[minmax(140px,auto)] md:grid-flow-dense">
        <WidgetSkeleton className="md:col-span-2 md:row-span-1" />
        <WidgetSkeleton className="md:col-span-1 md:row-span-2" />
        <WidgetSkeleton className="md:col-span-1 md:row-span-1" />
      </section>
    </main>
  );
}
