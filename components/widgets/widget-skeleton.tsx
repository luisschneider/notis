import { Skeleton } from "@/components/ui/skeleton";
import { WidgetFrame } from "./widget-frame";

interface WidgetSkeletonProps {
  title?: string;
}

export function WidgetSkeleton({ title = "Loading widget" }: WidgetSkeletonProps): React.JSX.Element {
  return (
    <WidgetFrame title={title}>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </WidgetFrame>
  );
}
