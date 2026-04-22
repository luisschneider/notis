import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetFrameProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}

export function WidgetFrame({
  title,
  subtitle,
  description,
  icon: Icon,
  emptyMessage,
  children,
  className,
}: WidgetFrameProps): React.JSX.Element {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-4 shadow-xs",
        className,
      )}
    >
      <header className="mb-3 space-y-0.5">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="text-sm">
        {children}
        {emptyMessage ? (
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        ) : null}
      </div>
    </article>
  );
}

