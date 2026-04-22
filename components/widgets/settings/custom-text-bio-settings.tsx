"use client";

import { useState, type FormEvent } from "react";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CustomTextBioSettingsProps {
  widget: WidgetInstanceRecord;
  onSaved: (nextWidget: WidgetInstanceRecord) => void;
}

interface SaveResponse {
  widget?: WidgetInstanceRecord;
  error?: string;
}

export function CustomTextBioSettings({
  widget,
  onSaved,
}: CustomTextBioSettingsProps): React.JSX.Element {
  const initialConfigTitle =
    typeof widget.config.title === "string" ? widget.config.title : "About";
  const initialMarkdown =
    typeof widget.data.markdown === "string"
      ? widget.data.markdown
      : typeof widget.data.body === "string"
        ? widget.data.body
        : "";

  const [title, setTitle] = useState<string>(initialConfigTitle);
  const [markdown, setMarkdown] = useState<string>(initialMarkdown);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/widgets/${widget.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          ...widget.config,
          title,
        },
        data: {
          ...widget.data,
          markdown,
          body: markdown,
        },
      }),
    });

    const json = (await response.json()) as SaveResponse;

    if (!response.ok || !json.widget) {
      setError(json.error ?? "Unable to save widget settings.");
      setIsSaving(false);
      return;
    }

    onSaved(json.widget);
    setMessage("Saved.");
    setIsSaving(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="bio-title">Widget title</Label>
        <Input
          id="bio-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="About me"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio-markdown">Markdown body</Label>
        <Textarea
          id="bio-markdown"
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          rows={8}
          placeholder="Write a short bio..."
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
