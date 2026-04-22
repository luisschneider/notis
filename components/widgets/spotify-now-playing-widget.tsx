import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import Image from "next/image";
import { WidgetFrame } from "./widget-frame";

interface SpotifyNowPlayingWidgetProps {
  widget: WidgetInstanceRecord;
}

export function SpotifyNowPlayingWidget({
  widget,
}: SpotifyNowPlayingWidgetProps): React.JSX.Element {
  const isPlaying = widget.data.isPlaying === true;
  const title = typeof widget.data.title === "string" ? widget.data.title : "";
  const artist = typeof widget.data.artist === "string" ? widget.data.artist : "";
  const albumArtUrl =
    typeof widget.data.albumArtUrl === "string" ? widget.data.albumArtUrl : "";

  return (
    <WidgetFrame title="Now Playing">
      {!isPlaying ? (
        <p className="text-sm text-muted-foreground">Not playing anything right now.</p>
      ) : (
        <div className="space-y-3">
          {albumArtUrl ? (
            <Image
              src={albumArtUrl}
              alt={`${title} artwork`}
              width={80}
              height={80}
              className="h-20 w-20 rounded-md object-cover"
            />
          ) : null}
          <div>
            <p className="text-sm font-medium">{title || "Unknown track"}</p>
            <p className="text-xs text-muted-foreground">{artist || "Unknown artist"}</p>
          </div>
        </div>
      )}
    </WidgetFrame>
  );
}
