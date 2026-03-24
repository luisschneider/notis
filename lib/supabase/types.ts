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
  widget_type: string;
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
  created_at: string;
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
