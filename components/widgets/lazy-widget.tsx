"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { WidgetSkeleton } from "./widget-skeleton";

interface LazyWidgetProps {
  children: ReactNode;
  className?: string;
}

export function LazyWidget({ children, className }: LazyWidgetProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : <WidgetSkeleton />}
    </div>
  );
}
