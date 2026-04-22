import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { WidgetFrame } from "./widget-frame";

interface WidgetSkeletonProps {
  title?: string;
  className?: string;
}

export function WidgetSkeleton({
  title = "Loading widget",
  className,
}: WidgetSkeletonProps): React.JSX.Element {
  return (
    <WidgetFrame title={title} className={cn(className)}>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </WidgetFrame>
  );
}
