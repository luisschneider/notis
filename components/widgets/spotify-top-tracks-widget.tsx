import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface SpotifyTopTracksWidgetProps {
  widget: WidgetInstanceRecord;
}

interface TrackItem {
  id: string;
  title: string;
  artist: string;
}

export function SpotifyTopTracksWidget({
  widget,
}: SpotifyTopTracksWidgetProps): React.JSX.Element {
  const tracks = Array.isArray(widget.data.tracks)
    ? (widget.data.tracks as TrackItem[])
    : [];
  const range =
    typeof widget.config.range === "string" ? widget.config.range : "medium_term";
  const rangeLabel =
    range === "short_term"
      ? "last 4 weeks"
      : range === "long_term"
        ? "all-time"
        : "last 6 months";

  return (
    <WidgetFrame title="Spotify Top Tracks" subtitle={rangeLabel}>
      {tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Connect Spotify and sync to load top tracks.
        </p>
      ) : (
        <ol className="space-y-2">
          {tracks.slice(0, 5).map((track, index) => (
            <li key={`${track.id}-${index}`} className="rounded-md border p-2 text-sm">
              <p className="font-medium">
                {index + 1}. {track.title}
              </p>
              <p className="text-xs text-muted-foreground">{track.artist}</p>
            </li>
          ))}
        </ol>
      )}
    </WidgetFrame>
  );
}
