import {
  BookOpen,
  Disc3,
  Github,
  Link2,
  MapPin,
  MessageSquareQuote,
  Music2,
  Quote,
  Rss,
  type LucideIcon,
} from "lucide-react";
import type { WidgetType, WidgetProvider } from "./types";

export interface WidgetRegistryItem {
  type: WidgetType;
  provider: WidgetProvider;
  displayName: string;
  description: string;
  icon: LucideIcon;
  gridWidth: 1 | 2;
  gridHeight: 1 | 2;
}

export interface WidgetProviderGroup {
  key: WidgetProvider;
  label: string;
  description: string;
}

export const WIDGET_PROVIDER_GROUPS: WidgetProviderGroup[] = [
  {
    key: "custom_text",
    label: "Custom Text",
    description: "Write freeform text cards.",
  },
  {
    key: "location",
    label: "Location",
    description: "Share where you are.",
  },
  {
    key: "reading_list",
    label: "Reading List",
    description: "Curate what you are reading.",
  },
  {
    key: "substack",
    label: "Substack",
    description: "Show your latest newsletters.",
  },
  {
    key: "github",
    label: "GitHub",
    description: "Display coding activity and repos.",
  },
  {
    key: "spotify",
    label: "Spotify",
    description: "Share your listening data.",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    description: "Feature tweets and handles.",
  },
];

export const WIDGET_REGISTRY: WidgetRegistryItem[] = [
  {
    type: "custom_text_bio",
    provider: "custom_text",
    displayName: "Bio / About",
    description: "A markdown bio or about section.",
    icon: MessageSquareQuote,
    gridWidth: 2,
    gridHeight: 2,
  },
  {
    type: "custom_text_links",
    provider: "custom_text",
    displayName: "Links",
    description: "List your favorite links.",
    icon: Link2,
    gridWidth: 1,
    gridHeight: 2,
  },
  {
    type: "custom_text_quote",
    provider: "custom_text",
    displayName: "Quote",
    description: "A favorite quote or motto.",
    icon: Quote,
    gridWidth: 1,
    gridHeight: 1,
  },
  {
    type: "location_current",
    provider: "location",
    displayName: "Current Location",
    description: "City and country flag.",
    icon: MapPin,
    gridWidth: 1,
    gridHeight: 1,
  },
  {
    type: "location_map",
    provider: "location",
    displayName: "Location Map",
    description: "A map preview centered on your current location.",
    icon: MapPin,
    gridWidth: 2,
    gridHeight: 1,
  },
  {
    type: "reading_list_items",
    provider: "reading_list",
    displayName: "Reading List",
    description: "Recent articles, books, and podcasts.",
    icon: BookOpen,
    gridWidth: 1,
    gridHeight: 2,
  },
  {
    type: "reading_list_currently_reading",
    provider: "reading_list",
    displayName: "Currently Reading",
    description: "Highlight what you are reading now.",
    icon: BookOpen,
    gridWidth: 1,
    gridHeight: 1,
  },
  {
    type: "substack_latest_posts",
    provider: "substack",
    displayName: "Substack Latest Posts",
    description: "Newest posts from your Substack feed.",
    icon: Rss,
    gridWidth: 2,
    gridHeight: 1,
  },
  {
    type: "substack_featured_post",
    provider: "substack",
    displayName: "Substack Featured Post",
    description: "Feature one highlighted Substack post.",
    icon: Rss,
    gridWidth: 2,
    gridHeight: 1,
  },
  {
    type: "github_recent_activity",
    provider: "github",
    displayName: "GitHub Activity",
    description: "Recent public GitHub events.",
    icon: Github,
    gridWidth: 1,
    gridHeight: 2,
  },
  {
    type: "github_pinned_repos",
    provider: "github",
    displayName: "Pinned Repositories",
    description: "Highlight favorite repositories.",
    icon: Github,
    gridWidth: 1,
    gridHeight: 2,
  },
  {
    type: "github_contribution_graph",
    provider: "github",
    displayName: "Contribution Graph",
    description: "A compact yearly contribution heatmap.",
    icon: Github,
    gridWidth: 2,
    gridHeight: 2,
  },
  {
    type: "spotify_now_playing",
    provider: "spotify",
    displayName: "Now Playing",
    description: "Current Spotify playback status.",
    icon: Disc3,
    gridWidth: 1,
    gridHeight: 1,
  },
  {
    type: "spotify_top_artists",
    provider: "spotify",
    displayName: "Top Artists",
    description: "Your favorite artists by time range.",
    icon: Music2,
    gridWidth: 1,
    gridHeight: 2,
  },
  {
    type: "spotify_top_tracks",
    provider: "spotify",
    displayName: "Top Tracks",
    description: "Most played tracks for a selected range.",
    icon: Music2,
    gridWidth: 1,
    gridHeight: 2,
  },
  {
    type: "spotify_recent_tracks",
    provider: "spotify",
    displayName: "Spotify Recent Tracks",
    description: "Recently played songs.",
    icon: Music2,
    gridWidth: 1,
    gridHeight: 2,
  },
  {
    type: "twitter_recent_tweets",
    provider: "twitter",
    displayName: "Recent Tweets",
    description: "Latest featured tweets.",
    icon: Link2,
    gridWidth: 2,
    gridHeight: 1,
  },
  {
    type: "twitter_pinned_tweet",
    provider: "twitter",
    displayName: "Pinned Tweet",
    description: "Feature one specific tweet.",
    icon: Link2,
    gridWidth: 2,
    gridHeight: 1,
  },
];

export const WIDGET_REGISTRY_MAP: Record<WidgetType, WidgetRegistryItem> = WIDGET_REGISTRY.reduce(
  (accumulator, item) => {
    accumulator[item.type] = item;
    return accumulator;
  },
  {} as Record<WidgetType, WidgetRegistryItem>,
);

export const WIDGET_REGISTRY_BY_TYPE = WIDGET_REGISTRY_MAP;
