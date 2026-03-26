"use client";

import { useEffect } from "react";

interface TrackViewProps {
  username: string;
}

export function TrackView({ username }: TrackViewProps): null {
  useEffect(() => {
    const referrer = document.referrer || undefined;

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, referrer }),
    }).catch(() => {
      // Silently ignore tracking failures
    });
  }, [username]);

  return null;
}
