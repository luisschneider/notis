"use client";

import { useState, type FormEvent } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";

interface SpotifySettingsProps {
  widget: WidgetInstanceRecord;
  onSaved: (nextWidget: WidgetInstanceRecord) => void;
}

interface ApiResponse {
  widget?: WidgetInstanceRecord;
  error?: string;
}

interface SyncApiResponse {
  updated?: number;
  error?: string;
}

type SpotifyRange = "short_term" | "medium_term" | "long_term";

function parseRange(value: unknown): SpotifyRange {
  if (value === "short_term" || value === "long_term") {
    return value;
  }
  return "medium_term";
}

export function SpotifySettings({
  widget,
  onSaved,
}: SpotifySettingsProps): React.JSX.Element {
  const [title, setTitle] = useState<string>(
    typeof widget.config.title === "string" ? widget.config.title : "Spotify",
  );
  const [maxItems, setMaxItems] = useState<number>(
    typeof widget.config.maxItems === "number" ? widget.config.maxItems : 5,
  );
  const [range, setRange] = useState<SpotifyRange>(parseRange(widget.config.range));
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function saveSettings(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/widgets/${widget.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            ...widget.config,
            title: title.trim() || "Spotify",
            maxItems: Math.max(1, Math.min(10, Math.floor(maxItems))),
            range,
          },
        }),
      });

      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.widget) {
        throw new Error(json.error ?? "Unable to save Spotify settings.");
      }

      onSaved(json.widget);
      setSuccessMessage("Spotify settings saved.");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save Spotify settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSync(): Promise<void> {
    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/widgets/spotify/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ widgetId: widget.id }),
      });
      const json = (await response.json()) as SyncApiResponse;
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to sync Spotify data.");
      }
      setSuccessMessage(`Spotify sync complete (${json.updated ?? 0} widget updated).`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sync Spotify data.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={saveSettings}>
      <div className="space-y-2">
        <Label htmlFor="spotify-title">Title</Label>
        <Input
          id="spotify-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Spotify"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="spotify-max-items">Max items</Label>
        <Input
          id="spotify-max-items"
          type="number"
          min={1}
          max={10}
          value={maxItems}
          onChange={(event) => setMaxItems(Number(event.target.value || 5))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="spotify-range">Time range</Label>
        <Select value={range} onValueChange={(value: SpotifyRange) => setRange(value)}>
          <SelectTrigger id="spotify-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short_term">Last 4 weeks</SelectItem>
            <SelectItem value="medium_term">Last 6 months</SelectItem>
            <SelectItem value="long_term">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{successMessage}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving
            </>
          ) : (
            "Save settings"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => void handleSync()} disabled={isSyncing}>
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Syncing
            </>
          ) : (
            <>
              <RefreshCcw className="mr-2 size-4" />
              Sync now
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
