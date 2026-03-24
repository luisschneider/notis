export const WIDGET_TYPES = [
  "custom_text_bio",
  "custom_text_links",
  "custom_text_quote",
  "location_current",
  "location_map",
  "reading_list_items",
  "reading_list_currently_reading",
  "substack_latest_posts",
  "substack_featured_post",
  "github_recent_activity",
  "github_pinned_repos",
  "github_contribution_graph",
  "spotify_recent_tracks",
  "spotify_top_artists",
  "spotify_top_tracks",
  "spotify_now_playing",
  "twitter_recent_tweets",
  "twitter_pinned_tweet",
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export type WidgetProvider =
  | "custom_text"
  | "location"
  | "reading_list"
  | "substack"
  | "github"
  | "spotify"
  | "twitter";

export type WidgetJsonObject = Record<string, unknown>;

export interface WidgetInstanceRecord {
  id: string;
  user_id: string;
  widget_type: WidgetType;
  position: number;
  config: WidgetJsonObject;
  data: WidgetJsonObject;
  is_visible: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WidgetDefaults {
  config: WidgetJsonObject;
  data: WidgetJsonObject;
}

export interface ReadingListItemType {
  id: string;
  user_id: string;
  widget_instance_id: string;
  title: string;
  url: string | null;
  author: string | null;
  description: string | null;
  item_type: "article" | "book" | "podcast" | "video" | "other";
  added_at: string;
}

const DEFAULT_WIDGETS: Record<WidgetType, WidgetDefaults> = {
  custom_text_bio: {
    config: { title: "About" },
    data: { body: "", title: "About me" },
  },
  custom_text_links: {
    config: { title: "Links" },
    data: { links: [] },
  },
  custom_text_quote: {
    config: { title: "Quote" },
    data: { quote: "", attribution: "" },
  },
  location_current: {
    config: { title: "Location" },
    data: { location: "", countryCode: "" },
  },
  location_map: {
    config: { title: "Map", zoom: 10 },
    data: { location: "", latitude: null, longitude: null },
  },
  reading_list_items: {
    config: { title: "Reading List", maxItems: 5 },
    data: { items: [] },
  },
  reading_list_currently_reading: {
    config: { title: "Currently Reading", maxItems: 2 },
    data: { items: [] },
  },
  substack_latest_posts: {
    config: { title: "Substack Posts", publication: "", maxItems: 3 },
    data: { posts: [] },
  },
  substack_featured_post: {
    config: { title: "Featured Post", publication: "", featuredUrl: "" },
    data: { post: null },
  },
  github_recent_activity: {
    config: { title: "GitHub Activity", username: "", maxItems: 5 },
    data: { events: [] },
  },
  github_pinned_repos: {
    config: { title: "Pinned Repos", username: "", maxItems: 4 },
    data: { repos: [] },
  },
  github_contribution_graph: {
    config: { title: "Contributions", username: "" },
    data: { weeks: [] },
  },
  spotify_recent_tracks: {
    config: { title: "Recent Tracks", maxItems: 5 },
    data: { tracks: [] },
  },
  spotify_top_artists: {
    config: { title: "Top Artists", maxItems: 5, range: "medium_term" },
    data: { artists: [] },
  },
  spotify_top_tracks: {
    config: { title: "Top Tracks", maxItems: 5, range: "medium_term" },
    data: { tracks: [] },
  },
  spotify_now_playing: {
    config: { title: "Now Playing" },
    data: { isPlaying: false, title: "", artist: "", albumArtUrl: "" },
  },
  twitter_recent_tweets: {
    config: { title: "Recent Tweets", maxItems: 3 },
    data: { tweets: [] },
  },
  twitter_pinned_tweet: {
    config: { title: "Pinned Tweet" },
    data: { tweet: null },
  },
};

export function isWidgetType(value: string): value is WidgetType {
  return (WIDGET_TYPES as readonly string[]).includes(value);
}

export function createDefaultWidgetData(widgetType: WidgetType): WidgetDefaults {
  const defaults = DEFAULT_WIDGETS[widgetType];
  return {
    config: { ...defaults.config },
    data: { ...defaults.data },
  };
}
