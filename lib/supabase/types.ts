export interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WidgetInstanceRow {
  id: string;
  user_id: string;
  widget_type:
    | "custom_text_bio"
    | "custom_text_links"
    | "custom_text_quote"
    | "location_current"
    | "location_map"
    | "reading_list_items"
    | "reading_list_currently_reading"
    | "substack_latest_posts"
    | "substack_featured_post"
    | "github_recent_activity"
    | "github_pinned_repos"
    | "github_contribution_graph"
    | "spotify_recent_tracks"
    | "spotify_top_artists"
    | "spotify_top_tracks"
    | "spotify_now_playing"
    | "twitter_recent_tweets"
    | "twitter_pinned_tweet";
  position: number;
  config: Record<string, unknown>;
  data: Record<string, unknown>;
  is_visible: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectedAccountRow {
  id: string;
  user_id: string;
  provider: "spotify" | "github" | "twitter";
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  provider_user_id: string;
  needs_reauth: boolean;
  created_at: string;
}

export interface BoardViewRow {
  id: string;
  profile_id: string;
  viewed_at: string;
  username_viewed: string;
  referrer: string | null;
  country: string | null;
}

export interface ReadingListItemRow {
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
