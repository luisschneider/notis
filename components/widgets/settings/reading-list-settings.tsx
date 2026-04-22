"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { ReadingListItemForm } from "./reading-list/reading-list-item-form";

interface ReadingListSettingsProps {
  widget: WidgetInstanceRecord;
  onSaved: (nextWidget: WidgetInstanceRecord) => void;
}

interface ApiResponse {
  widget?: WidgetInstanceRecord;
  error?: string;
}

interface ReadingListItem {
  id: string;
  user_id: string;
  widget_instance_id: string;
  title: string;
  url: string | null;
  author: string | null;
  description: string | null;
  item_type: "article" | "book" | "podcast" | "video" | "other";
  added_at: string;
}

interface ReadingListResponse {
  items?: ReadingListItem[];
  item?: ReadingListItem;
  error?: string;
}

function parseMaxItems(config: Record<string, unknown>): number {
  if (typeof config.maxItems === "number") {
    return config.maxItems;
  }

  if (typeof config.max_items === "number") {
    return config.max_items;
  }

  return 5;
}

export function ReadingListSettings({
  widget,
  onSaved,
}: ReadingListSettingsProps): React.JSX.Element {
  const [title, setTitle] = useState(
    typeof widget.config.title === "string" ? widget.config.title : "Reading List",
  );
  const [maxItems, setMaxItems] = useState(parseMaxItems(widget.config));
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>(true);

  const maxVisibleItems = useMemo(
    () => Math.max(1, Math.min(10, Math.floor(maxItems))),
    [maxItems],
  );

  useEffect(() => {
    let isMounted = true;
    async function loadItems(): Promise<void> {
      setIsLoadingItems(true);
      try {
        const response = await fetch(
          `/api/reading-list-items?widget_instance_id=${encodeURIComponent(widget.id)}`,
          { cache: "no-store" },
        );
        const json = (await response.json()) as ReadingListResponse;
        if (!response.ok || !json.items) {
          throw new Error(json.error ?? "Unable to load reading list items.");
        }
        if (isMounted) {
          setItems(json.items);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load reading list items.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingItems(false);
        }
      }
    }
    void loadItems();
    return () => {
      isMounted = false;
    };
  }, [widget.id]);

  async function handleSave(): Promise<void> {
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
            title: title.trim() || "Reading List",
            maxItems: Math.max(1, Math.min(10, Math.floor(maxItems))),
          },
        }),
      });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.widget) {
        throw new Error(json.error ?? "Unable to save settings.");
      }
      onSaved(json.widget);
      setSuccessMessage("Settings saved.");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string): Promise<void> {
    setErrorMessage(null);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== itemId));
    const response = await fetch(`/api/reading-list-items?id=${encodeURIComponent(itemId)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const json = (await response.json()) as ReadingListResponse;
      setItems(previous);
      setErrorMessage(json.error ?? "Unable to delete reading list item.");
      return;
    }
    setSuccessMessage("Reading list item removed.");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="reading-list-title">Title</Label>
        <Input
          id="reading-list-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Reading List"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reading-list-max-items">Max items</Label>
        <Input
          id="reading-list-max-items"
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

      <div className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Add reading item</h3>
        <ReadingListItemForm
          widgetId={widget.id}
          onSaved={async () => {
            const response = await fetch(
              `/api/reading-list-items?widget_instance_id=${encodeURIComponent(widget.id)}`,
              { cache: "no-store" },
            );
            const json = (await response.json()) as ReadingListResponse;
            if (!response.ok || !json.items) {
              throw new Error(json.error ?? "Unable to refresh reading list items.");
            }
            setItems(json.items);
            setSuccessMessage("Reading list item added.");
          }}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Reading items</h3>
        {isLoadingItems ? (
          <p className="text-sm text-muted-foreground">Loading items…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reading items yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.slice(0, maxVisibleItems).map((item) => (
              <li key={item.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.item_type}
                      {item.author ? ` • ${item.author}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDeleteItem(item.id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
