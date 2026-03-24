import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface SpotifyRecentTracksWidgetProps {
  widget: WidgetInstanceRecord;
}

export function SpotifyRecentTracksWidget({
  widget,
}: SpotifyRecentTracksWidgetProps): React.JSX.Element {
  const tracks = Array.isArray(widget.data.tracks)
    ? widget.data.tracks
    : [];
  return (
    <WidgetFrame title="Spotify Recent Tracks" subtitle={`Synced ${tracks.length} tracks`}>
      {tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Connect Spotify to show recent tracks.</p>
      ) : (
        <ul className="space-y-2">
          {tracks.slice(0, 5).map((track) => (
            <li key={track.id} className="rounded-md border p-2 text-sm">
              <p className="font-medium">{track.title}</p>
              <p className="text-xs text-muted-foreground">{track.artist}</p>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
}
