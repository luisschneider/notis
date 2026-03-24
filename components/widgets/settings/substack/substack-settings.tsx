"use client";

import { useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SubstackSettingsProps {
  widget: WidgetInstanceRecord;
  onSaved: (nextWidget: WidgetInstanceRecord) => void;
}

interface WidgetApiResponse {
  widget?: WidgetInstanceRecord;
  error?: string;
}

interface SyncApiResponse {
  updated?: number;
  widget?: WidgetInstanceRecord;
  error?: string;
}

export function SubstackSettings({
  widget,
  onSaved,
}: SubstackSettingsProps): React.JSX.Element {
  const [publication, setPublication] = useState<string>(
    typeof widget.config.publication === "string" ? widget.config.publication : "",
  );
  const [maxItems, setMaxItems] = useState<number>(
    typeof widget.config.maxItems === "number" ? widget.config.maxItems : 3,
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/widgets/${widget.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            ...widget.config,
            publication: publication.trim(),
            maxItems: Math.max(1, Math.min(10, Math.floor(maxItems))),
          },
        }),
      });
      const json = (await response.json()) as WidgetApiResponse;
      if (!response.ok || !json.widget) {
        throw new Error(json.error ?? "Unable to save Substack widget settings.");
      }
      onSaved(json.widget);
      setMessage("Substack settings saved.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save Substack settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSync(): Promise<void> {
    setIsSyncing(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const response = await fetch("/api/widgets/substack/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ widgetId: widget.id }),
      });
      const json = (await response.json()) as SyncApiResponse;
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to sync Substack data.");
      }
      if (json.widget) {
        onSaved(json.widget);
      }
      setMessage(`Substack sync complete (${json.updated ?? 0} widget updated).`);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sync Substack data.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="substack-publication">Publication</Label>
        <Input
          id="substack-publication"
          value={publication}
          onChange={(event) => setPublication(event.target.value)}
          placeholder="publication-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="substack-max-items">Max posts</Label>
        <Input
          id="substack-max-items"
          type="number"
          min={1}
          max={10}
          value={maxItems}
          onChange={(event) => setMaxItems(Number(event.target.value || 3))}
        />
      </div>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}
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
