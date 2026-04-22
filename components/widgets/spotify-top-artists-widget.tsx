import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface SpotifyTopArtistsWidgetProps {
  widget: WidgetInstanceRecord;
}

export function SpotifyTopArtistsWidget({
  widget,
}: SpotifyTopArtistsWidgetProps): React.JSX.Element {
  const artists = Array.isArray(widget.data.artists)
    ? (widget.data.artists as Array<Record<string, unknown>>)
    : [];
  const rangeLabel = typeof widget.config.range === "string" ? widget.config.range : "medium_term";

  return (
    <WidgetFrame title="Spotify Top Artists" subtitle={`Range: ${rangeLabel}`}>
      {artists.length === 0 ? (
        <p className="text-sm text-muted-foreground">No top artists synced yet.</p>
      ) : (
        <ul className="space-y-2">
          {artists.slice(0, 5).map((artist, index) => {
            const id = typeof artist.id === "string" ? artist.id : `artist-${index}`;
            const name = typeof artist.name === "string" ? artist.name : "Unknown artist";
            return (
              <li key={id} className="rounded-md border p-2 text-sm">
                {name}
              </li>
            );
          })}
        </ul>
      )}
    </WidgetFrame>
  );
}
