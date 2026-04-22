"use client";

import { useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";

interface GithubSettingsProps {
  widget: WidgetInstanceRecord;
  onSaved: (nextWidget: WidgetInstanceRecord) => void;
}

interface WidgetApiResponse {
  widget?: WidgetInstanceRecord;
  error?: string;
}

interface SyncApiResponse {
  updated?: number;
  synced?: number;
  error?: string;
}

function parseValue(source: Record<string, unknown>, key: string, fallback: string): string {
  return typeof source[key] === "string" ? source[key] : fallback;
}

function parseNumberValue(source: Record<string, unknown>, key: string, fallback: number): number {
  return typeof source[key] === "number" ? source[key] : fallback;
}

export function GithubSettings({
  widget,
  onSaved,
}: GithubSettingsProps): React.JSX.Element {
  const [username, setUsername] = useState<string>(
    parseValue(widget.config, "username", ""),
  );
  const [maxItems, setMaxItems] = useState<number>(
    parseNumberValue(widget.config, "maxItems", 5),
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      config: {
        ...widget.config,
        username: username.trim(),
        maxItems: Math.max(1, Math.min(10, Math.floor(maxItems))),
      },
    };

    try {
      const response = await fetch(`/api/widgets/${widget.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as WidgetApiResponse;
      if (!response.ok || !json.widget) {
        throw new Error(json.error ?? "Unable to save widget settings.");
      }

      onSaved(json.widget);
      setSuccessMessage("GitHub widget settings saved.");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSync(): Promise<void> {
    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/widgets/github/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ widgetId: widget.id }),
      });
      const json = (await response.json()) as SyncApiResponse;
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to sync GitHub data.");
      }
      setSuccessMessage(`GitHub sync complete (${json.updated ?? json.synced ?? 0} widget updated).`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sync GitHub data.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`github-username-${widget.id}`}>GitHub username</Label>
        <Input
          id={`github-username-${widget.id}`}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="octocat"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`github-max-items-${widget.id}`}>Max items</Label>
        <Input
          id={`github-max-items-${widget.id}`}
          type="number"
          min={1}
          max={10}
          value={maxItems}
          onChange={(event) => setMaxItems(Number(event.target.value || 5))}
        />
      </div>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{successMessage}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
