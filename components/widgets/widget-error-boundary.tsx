"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface WidgetErrorBoundaryProps {
  title: string;
  children: ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  public constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Intentionally suppress widget-level runtime errors to avoid breaking the whole board.
    console.error("Widget render error:", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <article className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <h3 className="text-sm font-semibold tracking-tight">{this.props.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            This widget failed to render. Please re-open settings or try syncing again.
          </p>
        </article>
      );
    }

    return this.props.children;
  }
}
