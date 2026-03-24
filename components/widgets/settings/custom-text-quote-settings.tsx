"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";

interface CustomTextQuoteSettingsProps {
  widget: WidgetInstanceRecord;
  onSaved?: (nextWidget: WidgetInstanceRecord) => void;
}

interface UpdateWidgetResponse {
  widget?: WidgetInstanceRecord;
  error?: string;
}

export function CustomTextQuoteSettings({
  widget,
  onSaved,
}: CustomTextQuoteSettingsProps): React.JSX.Element {
  const initialQuote = useMemo(() => {
    const value = widget.data.quote;
    return typeof value === "string" ? value : "";
  }, [widget.data.quote]);
  const initialAttribution = useMemo(() => {
    const value = widget.data.attribution;
    return typeof value === "string" ? value : "";
  }, [widget.data.attribution]);
  const initialTitle = useMemo(() => {
    const value = widget.config.title;
    return typeof value === "string" ? value : "Quote";
  }, [widget.config.title]);

  const [title, setTitle] = useState(initialTitle);
  const [quote, setQuote] = useState(initialQuote);
  const [attribution, setAttribution] = useState(initialAttribution);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/widgets/${widget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: { title: title.trim() || "Quote" },
        data: {
          quote: quote.trim(),
          attribution: attribution.trim(),
        },
      }),
    });

    const json = (await response.json()) as UpdateWidgetResponse;
    if (!response.ok || !json.widget) {
      setError(json.error ?? "Unable to save quote widget.");
      setIsSaving(false);
      return;
    }

    if (onSaved) {
      onSaved(json.widget);
    }
    setMessage("Quote widget saved.");
    setIsSaving(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="quote-title">Title</Label>
        <Input
          id="quote-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Quote"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="quote-text">Quote</Label>
        <Textarea
          id="quote-text"
          value={quote}
          onChange={(event) => setQuote(event.target.value)}
          placeholder="Write a quote..."
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="quote-attribution">Attribution</Label>
        <Input
          id="quote-attribution"
          value={attribution}
          onChange={(event) => setAttribution(event.target.value)}
          placeholder="Author or source"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      <Button type="submit" disabled={isSaving} className="gap-2">
        <Save className="size-4" />
        {isSaving ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
