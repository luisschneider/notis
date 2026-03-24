import { WIDGET_REGISTRY_MAP } from "@/lib/widgets/registry";
import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { TextBioWidget } from "./text-bio-widget";
import { TextLinksWidget } from "./text-links-widget";
import { TextQuoteWidget } from "./text-quote-widget";
import { WidgetFrame } from "./widget-frame";
import { LocationCurrentWidget } from "./location-current-widget";
import { ReadingListWidget } from "./reading-list-widget";
import { GitHubRecentActivityWidget } from "./github-recent-activity-widget";
import { GithubPinnedReposWidget } from "./github-pinned-repos-widget";
import { GithubContributionGraphWidget } from "./github-contribution-graph-widget";
import { SubstackLatestPostsWidget } from "./substack-latest-posts-widget";
import { SubstackFeaturedPostWidget } from "./substack-featured-post-widget";
import { SpotifyRecentTracksWidget } from "./spotify-recent-tracks-widget";
import { SpotifyNowPlayingWidget } from "./spotify-now-playing-widget";
import { SpotifyTopArtistsWidget } from "./spotify-top-artists-widget";
import { SpotifyTopTracksWidget } from "./spotify-top-tracks-widget";
import { TwitterRecentTweetsWidget } from "./twitter-recent-tweets-widget";
import { TwitterPinnedTweetWidget } from "./twitter-pinned-tweet-widget";
import { WidgetErrorBoundary } from "./widget-error-boundary";

interface RenderWidgetProps {
  widget: WidgetInstanceRecord;
}

export function WidgetRenderer({ widget }: RenderWidgetProps): React.JSX.Element {
  const registry = WIDGET_REGISTRY_MAP[widget.widget_type];
  const title = registry?.displayName ?? widget.widget_type;

  const content = (() => {
    switch (widget.widget_type) {
      case "custom_text_bio":
        return <TextBioWidget widget={widget} />;
      case "custom_text_links":
        return <TextLinksWidget widget={widget} />;
      case "custom_text_quote":
        return <TextQuoteWidget widget={widget} />;
      case "location_current":
        return <LocationCurrentWidget widget={widget} />;
      case "location_map":
        return <LocationCurrentWidget widget={widget} />;
      case "reading_list_items":
        return <ReadingListWidget widget={widget} />;
      case "reading_list_currently_reading":
        return <ReadingListWidget widget={widget} />;
      case "github_recent_activity":
        return <GitHubRecentActivityWidget widget={widget} />;
    case "github_pinned_repos":
      return <GithubPinnedReposWidget widget={widget} />;
    case "github_contribution_graph":
      return <GithubContributionGraphWidget widget={widget} />;
      case "substack_latest_posts":
        return <SubstackLatestPostsWidget widget={widget} />;
      case "substack_featured_post":
        return <SubstackFeaturedPostWidget widget={widget} />;
      case "spotify_recent_tracks":
        return <SpotifyRecentTracksWidget widget={widget} />;
      case "spotify_top_artists":
        return <SpotifyTopArtistsWidget widget={widget} />;
      case "spotify_top_tracks":
        return <SpotifyTopTracksWidget widget={widget} />;
      case "spotify_now_playing":
        return <SpotifyNowPlayingWidget widget={widget} />;
      case "twitter_recent_tweets":
        return <TwitterRecentTweetsWidget widget={widget} />;
      case "twitter_pinned_tweet":
        return <TwitterPinnedTweetWidget widget={widget} />;
      default:
        return (
          <WidgetFrame title={title}>
            <p className="text-sm text-muted-foreground">
              This widget type is registered but not yet implemented in detail.
            </p>
          </WidgetFrame>
        );
    }
  })();

  return (
    <WidgetErrorBoundary title={title}>
      {content}
    </WidgetErrorBoundary>
  );
}
