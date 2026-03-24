"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ReadingListItemType = "article" | "book" | "podcast" | "video" | "other";

export interface ReadingListItemPayload {
  title: string;
  url: string;
  author: string;
  description: string;
  item_type: ReadingListItemType;
}

interface ReadingListItemFormProps {
  widgetId: string;
  onSaved: () => Promise<void>;
}

interface OgResponse {
  title?: string;
  description?: string;
  error?: string;
}

export function ReadingListItemForm({
  widgetId,
  onSaved,
}: ReadingListItemFormProps): React.JSX.Element {
  const [itemType, setItemType] = useState<ReadingListItemType>("article");
  const [title, setTitle] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [author, setAuthor] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isFetchingOg, setIsFetchingOg] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFetchOg(): Promise<void> {
    if (!url.trim()) {
      setError("Add a URL first to fetch Open Graph data.");
      return;
    }
    setIsFetchingOg(true);
    setError(null);
    try {
      const response = await fetch("/api/widgets/reading-list/og-fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = (await response.json()) as OgResponse;
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to fetch metadata.");
      }
      if (json.title && !title.trim()) {
        setTitle(json.title);
      }
      if (json.description && !description.trim()) {
        setDescription(json.description);
      }
      setMessage("Fetched metadata from URL.");
    } catch (fetchError: unknown) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch metadata.");
    } finally {
      setIsFetchingOg(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const payload: ReadingListItemPayload = {
      title: title.trim(),
      url: url.trim(),
      author: author.trim(),
      description: description.trim(),
      item_type: itemType,
    };

    if (!payload.title) {
      setError("Title is required.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/reading-list-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          widget_id: widgetId,
          ...payload,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to add reading list item.");
      }

      setTitle("");
      setUrl("");
      setAuthor("");
      setDescription("");
      setItemType("article");
      setMessage("Reading list item added.");
      await onSaved();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save item.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleUrlChange(event: ChangeEvent<HTMLInputElement>): void {
    setUrl(event.target.value);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reading-item-title">Title</Label>
          <Input
            id="reading-item-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="An essay worth sharing"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reading-item-type">Type</Label>
          <Select value={itemType} onValueChange={(value: ReadingListItemType) => setItemType(value)}>
            <SelectTrigger id="reading-item-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="article">Article</SelectItem>
              <SelectItem value="book">Book</SelectItem>
              <SelectItem value="podcast">Podcast</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reading-item-url">URL (optional)</Label>
        <div className="flex gap-2">
          <Input
            id="reading-item-url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://example.com/post"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleFetchOg()}
            disabled={isFetchingOg}
          >
            {isFetchingOg ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Fetching
              </>
            ) : (
              "Fetch OG"
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reading-item-author">Author (optional)</Label>
        <Input
          id="reading-item-author"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="Author name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reading-item-description">Short note</Label>
        <Textarea
          id="reading-item-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Why this is interesting..."
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving
          </>
        ) : (
          "Add item"
        )}
      </Button>
    </form>
  );
}
