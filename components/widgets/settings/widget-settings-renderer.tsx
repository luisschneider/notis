"use client";

import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { CustomTextBioSettings } from "./custom-text-bio-settings";
import { CustomTextLinksSettings } from "./custom-text-links-settings";
import { CustomTextQuoteSettings } from "./custom-text-quote-settings";
import { LocationCurrentSettings } from "./location-current-settings";
import { LocationMapSettings } from "./location-map-settings";
import { ReadingListSettings } from "./reading-list-settings";
import { SubstackSettings } from "./substack/substack-settings";
import { GithubSettings } from "./github/github-settings";
import { SpotifySettings } from "./spotify/spotify-settings";
import { TwitterSettings } from "./twitter/twitter-settings";

interface WidgetSettingsRendererProps {
  widget: WidgetInstanceRecord;
  onSaved?: (nextWidget: WidgetInstanceRecord) => void;
}

interface UnsupportedSettingsProps {
  widgetType: string;
}

function UnsupportedSettings({ widgetType }: UnsupportedSettingsProps): React.JSX.Element {
  return (
    <p className="text-sm text-muted-foreground">
      Settings for <code>{widgetType}</code> will be added in later provider phases.
    </p>
  );
}

export function WidgetSettingsRenderer({
  widget,
  onSaved,
}: WidgetSettingsRendererProps): React.JSX.Element {
  const handleSaved = (nextWidget: WidgetInstanceRecord): void => {
    if (onSaved) {
      onSaved(nextWidget);
    }
  };
  switch (widget.widget_type) {
    case "custom_text_bio":
      return <CustomTextBioSettings widget={widget} onSaved={handleSaved} />;
    case "custom_text_links":
      return <CustomTextLinksSettings widget={widget} onSaved={handleSaved} />;
    case "custom_text_quote":
      return <CustomTextQuoteSettings widget={widget} onSaved={handleSaved} />;
    case "location_current":
      return <LocationCurrentSettings widget={widget} onSaved={handleSaved} />;
    case "location_map":
      return <LocationMapSettings widget={widget} onSaved={handleSaved} />;
    case "reading_list_items":
    case "reading_list_currently_reading":
      return <ReadingListSettings widget={widget} onSaved={handleSaved} />;
    case "substack_latest_posts":
    case "substack_featured_post":
      return <SubstackSettings widget={widget} onSaved={handleSaved} />;
    case "github_recent_activity":
    case "github_pinned_repos":
    case "github_contribution_graph":
      return <GithubSettings widget={widget} onSaved={handleSaved} />;
    case "spotify_recent_tracks":
    case "spotify_top_artists":
    case "spotify_top_tracks":
    case "spotify_now_playing":
      return <SpotifySettings widget={widget} onSaved={handleSaved} />;
    case "twitter_recent_tweets":
    case "twitter_pinned_tweet":
      return <TwitterSettings widget={widget} onSaved={handleSaved} />;
    default:
      return <UnsupportedSettings widgetType={widget.widget_type} />;
  }
}
