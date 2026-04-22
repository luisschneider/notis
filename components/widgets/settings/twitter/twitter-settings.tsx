"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";

interface TwitterSettingsProps {
  widget: WidgetInstanceRecord;
  onSaved: (nextWidget: WidgetInstanceRecord) => void;
}

interface WidgetResponse {
  widget?: WidgetInstanceRecord;
  error?: string;
}

function parseTweetUrls(data: Record<string, unknown>): string[] {
  if (!Array.isArray(data.tweetUrls)) {
    return [];
  }
  return data.tweetUrls.filter((item): item is string => typeof item === "string");
}

export function TwitterSettings({
  widget,
  onSaved,
}: TwitterSettingsProps): React.JSX.Element {
  const [handle, setHandle] = useState<string>(
    typeof widget.config.handle === "string" ? widget.config.handle : "",
  );
  const [tweetUrls, setTweetUrls] = useState<string>(
    parseTweetUrls(widget.data).join("\n"),
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedUrls = tweetUrls
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const pinnedTweetUrl = normalizedUrls[0] ?? "";

    try {
      const response = await fetch(`/api/widgets/${widget.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            ...widget.config,
            handle: handle.trim(),
            pinnedTweetUrl,
          },
          data: {
            ...widget.data,
            tweetUrls: normalizedUrls,
          },
        }),
      });
      const json = (await response.json()) as WidgetResponse;
      if (!response.ok || !json.widget) {
        throw new Error(json.error ?? "Unable to save Twitter settings.");
      }
      onSaved(json.widget);
      setSuccessMessage("Twitter settings saved.");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save Twitter settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="twitter-handle">Twitter handle</Label>
        <Input
          id="twitter-handle"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          placeholder="notisapp"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="twitter-tweets">Tweet URLs (one per line)</Label>
        <Textarea
          id="twitter-tweets"
          value={tweetUrls}
          onChange={(event) => setTweetUrls(event.target.value)}
          placeholder="https://x.com/username/status/123..."
          rows={6}
        />
      </div>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{successMessage}</p>
      ) : null}
      <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving
          </>
        ) : (
          "Save settings"
        )}
      </Button>
    </div>
  );
}
