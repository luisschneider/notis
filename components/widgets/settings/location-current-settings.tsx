"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";

interface LocationCurrentSettingsProps {
  widget: WidgetInstanceRecord;
  onSaved: (nextWidget: WidgetInstanceRecord) => void;
}

interface ApiResponse {
  widget?: WidgetInstanceRecord;
  error?: string;
}

export function LocationCurrentSettings({
  widget: initialWidget,
  onSaved,
}: LocationCurrentSettingsProps): React.JSX.Element {
  const initialConfig = initialWidget.config;
  const initialData = initialWidget.data;

  const [title, setTitle] = useState(
    typeof initialConfig.title === "string" ? initialConfig.title : "Location",
  );
  const [location, setLocation] = useState(
    typeof initialData.location === "string" ? initialData.location : "",
  );
  const [countryCode, setCountryCode] = useState(
    typeof initialData.countryCode === "string" ? initialData.countryCode : "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/widgets/${initialWidget.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          title: title.trim() || "Location",
        },
        data: {
          location: location.trim(),
          countryCode: countryCode.trim().toUpperCase(),
        },
      }),
    });

    const json = (await response.json()) as ApiResponse;
    if (!response.ok || !json.widget) {
      setErrorMessage(json.error ?? "Unable to save settings.");
      setIsSaving(false);
      return;
    }

    onSaved(json.widget);
    setSuccessMessage("Settings saved.");
    setIsSaving(false);
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="location-title">Widget title</Label>
        <Input
          id="location-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Location"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-value">Current location</Label>
        <Input
          id="location-value"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Berlin, Germany"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-country-code">Country code (optional)</Label>
        <Input
          id="location-country-code"
          value={countryCode}
          onChange={(event) => setCountryCode(event.target.value)}
          placeholder="DE"
          maxLength={2}
        />
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{successMessage}</p>
      ) : null}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
