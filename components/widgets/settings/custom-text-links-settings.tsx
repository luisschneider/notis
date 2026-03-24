"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";

interface LinkItem {
  label: string;
  url: string;
}

interface CustomTextLinksSettingsProps {
  widget: WidgetInstanceRecord;
  onSaved: (nextWidget: WidgetInstanceRecord) => void;
}

interface UpdateResponse {
  widget?: WidgetInstanceRecord;
  error?: string;
}

function parseLinks(value: unknown): LinkItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: LinkItem[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const label = "label" in item && typeof item.label === "string" ? item.label : "";
    const url = "url" in item && typeof item.url === "string" ? item.url : "";
    items.push({ label, url });
  }
  return items;
}

export function CustomTextLinksSettings({
  widget,
  onSaved,
}: CustomTextLinksSettingsProps): React.JSX.Element {
  const initialTitle =
    typeof widget.config.title === "string" ? widget.config.title : "Links";
  const [title, setTitle] = useState<string>(initialTitle);
  const [links, setLinks] = useState<LinkItem[]>(parseLinks(widget.data.links));
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  function addLink(): void {
    setLinks((current) => [...current, { label: "", url: "" }]);
  }

  function removeLink(index: number): void {
    setLinks((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function updateLink(index: number, patch: Partial<LinkItem>): void {
    setLinks((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function onSave(): Promise<void> {
    setIsSaving(true);
    setMessage(null);
    try {
      const payload = {
        config: {
          ...widget.config,
          title,
        },
        data: {
          ...widget.data,
          links: links
            .map((item) => ({
              label: item.label.trim(),
              url: item.url.trim(),
            }))
            .filter((item) => item.label && item.url),
        },
      };
      const response = await fetch(`/api/widgets/${widget.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as UpdateResponse;
      if (!response.ok || !json.widget) {
        throw new Error(json.error ?? "Unable to save widget settings.");
      }
      onSaved(json.widget);
      setMessage("Saved.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Links settings</CardTitle>
        <CardDescription>Manage title and list of links for this widget.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="links-title">Title</Label>
          <Input
            id="links-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Links</Label>
            <Button type="button" size="sm" variant="outline" onClick={addLink}>
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          </div>
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No links yet.</p>
          ) : null}
          <ul className="space-y-3">
            {links.map((item, index) => (
              <li key={`${index}-${item.url}`} className="grid gap-2 rounded border p-3">
                <Input
                  placeholder="Label"
                  value={item.label}
                  onChange={(event) => updateLink(index, { label: event.target.value })}
                />
                <Input
                  placeholder="https://example.com"
                  value={item.url}
                  onChange={(event) => updateLink(index, { url: event.target.value })}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLink(index)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => void onSave()} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
