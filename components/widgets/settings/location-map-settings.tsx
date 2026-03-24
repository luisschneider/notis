"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationMapSettingsProps {
  widget: WidgetInstanceRecord;
  onSaved: (nextWidget: WidgetInstanceRecord) => void;
}

interface ApiResponse {
  widget?: WidgetInstanceRecord;
  error?: string;
}

export function LocationMapSettings({
  widget,
  onSaved,
}: LocationMapSettingsProps): React.JSX.Element {
  const [title, setTitle] = useState(
    typeof widget.config.title === "string" ? widget.config.title : "Map",
  );
  const [zoom, setZoom] = useState(
    typeof widget.config.zoom === "number" ? widget.config.zoom : 10,
  );
  const [location, setLocation] = useState(
    typeof widget.data.location === "string" ? widget.data.location : "",
  );
  const [latitude, setLatitude] = useState(
    typeof widget.data.latitude === "number" ? String(widget.data.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    typeof widget.data.longitude === "number" ? String(widget.data.longitude) : "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/widgets/${widget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            title: title.trim() || "Map",
            zoom,
          },
          data: {
            location: location.trim(),
            latitude: latitude.trim() ? Number(latitude) : null,
            longitude: longitude.trim() ? Number(longitude) : null,
          },
        }),
      });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.widget) {
        throw new Error(json.error ?? "Unable to save settings.");
      }
      onSaved(json.widget);
      setSuccess("Settings saved.");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="location-map-title">Widget title</Label>
        <Input
          id="location-map-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Map"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-map-label">Location label</Label>
        <Input
          id="location-map-label"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Lisbon, Portugal"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location-map-lat">Latitude</Label>
          <Input
            id="location-map-lat"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="38.7223"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location-map-lng">Longitude</Label>
          <Input
            id="location-map-lng"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="-9.1393"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-map-zoom">Zoom</Label>
        <Input
          id="location-map-zoom"
          type="number"
          min={1}
          max={18}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value || 10))}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save settings"
        )}
      </Button>
    </div>
  );
}
