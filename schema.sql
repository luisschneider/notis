-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profile_block_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  block_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_block_settings_pkey PRIMARY KEY (id),
  CONSTRAINT profile_block_settings_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_book_current (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  title text NOT NULL,
  author text NOT NULL,
  year smallint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_book_current_pkey PRIMARY KEY (id),
  CONSTRAINT profile_book_current_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_holiday_bucket_list (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  item text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_holiday_bucket_list_pkey PRIMARY KEY (id),
  CONSTRAINT profile_holiday_bucket_list_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_learning (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_learning_pkey PRIMARY KEY (id),
  CONSTRAINT profile_learning_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_location (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  location text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_location_pkey PRIMARY KEY (id),
  CONSTRAINT profile_location_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_quote (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  quote text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_quote_pkey PRIMARY KEY (id),
  CONSTRAINT profile_quote_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_reading_list (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  url text NOT NULL,
  title text NOT NULL,
  publication text NOT NULL,
  favicon_url text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_reading_list_pkey PRIMARY KEY (id),
  CONSTRAINT profile_reading_list_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_social_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  platform text NOT NULL,
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_social_links_pkey PRIMARY KEY (id),
  CONSTRAINT profile_social_links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_song_of_the_day (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_song_of_the_day_pkey PRIMARY KEY (id),
  CONSTRAINT profile_song_of_the_day_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_spotify_playlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_spotify_playlist_pkey PRIMARY KEY (id),
  CONSTRAINT profile_spotify_playlist_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  status text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_status_pkey PRIMARY KEY (id),
  CONSTRAINT profile_status_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_thinking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_thinking_pkey PRIMARY KEY (id),
  CONSTRAINT profile_thinking_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_top_films (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  rank smallint NOT NULL CHECK (rank >= 1 AND rank <= 3),
  title text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_top_films_pkey PRIMARY KEY (id),
  CONSTRAINT profile_top_films_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,20}$'::text),
  name text NOT NULL,
  bio text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.profile_block_order (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  block_key text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_block_order_pkey PRIMARY KEY (id),
  CONSTRAINT profile_block_order_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT profile_block_order_profile_id_block_key_key UNIQUE (profile_id, block_key),
  CONSTRAINT profile_block_order_profile_id_position_key UNIQUE (profile_id, position)
);

CREATE INDEX profile_block_settings_profile_id_idx ON public.profile_block_settings (profile_id);
CREATE INDEX profile_holiday_bucket_list_profile_id_idx ON public.profile_holiday_bucket_list (profile_id);
CREATE INDEX profile_reading_list_profile_id_idx ON public.profile_reading_list (profile_id);
CREATE INDEX profile_social_links_profile_id_idx ON public.profile_social_links (profile_id);
CREATE INDEX profile_top_films_profile_id_idx ON public.profile_top_films (profile_id);
CREATE INDEX profile_block_order_profile_id_idx ON public.profile_block_order (profile_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_thinking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_quote ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_book_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_spotify_playlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_song_of_the_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_top_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_holiday_bucket_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reading_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_block_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_block_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_public_read
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY profiles_owner_insert
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_owner_update
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_owner_delete
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

CREATE POLICY profile_location_public_read
  ON public.profile_location FOR SELECT
  USING (true);
CREATE POLICY profile_location_owner_write
  ON public.profile_location FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_thinking_public_read
  ON public.profile_thinking FOR SELECT
  USING (true);
CREATE POLICY profile_thinking_owner_write
  ON public.profile_thinking FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_learning_public_read
  ON public.profile_learning FOR SELECT
  USING (true);
CREATE POLICY profile_learning_owner_write
  ON public.profile_learning FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_status_public_read
  ON public.profile_status FOR SELECT
  USING (true);
CREATE POLICY profile_status_owner_write
  ON public.profile_status FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_quote_public_read
  ON public.profile_quote FOR SELECT
  USING (true);
CREATE POLICY profile_quote_owner_write
  ON public.profile_quote FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_book_current_public_read
  ON public.profile_book_current FOR SELECT
  USING (true);
CREATE POLICY profile_book_current_owner_write
  ON public.profile_book_current FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_spotify_playlist_public_read
  ON public.profile_spotify_playlist FOR SELECT
  USING (true);
CREATE POLICY profile_spotify_playlist_owner_write
  ON public.profile_spotify_playlist FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_song_of_the_day_public_read
  ON public.profile_song_of_the_day FOR SELECT
  USING (true);
CREATE POLICY profile_song_of_the_day_owner_write
  ON public.profile_song_of_the_day FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_top_films_public_read
  ON public.profile_top_films FOR SELECT
  USING (true);
CREATE POLICY profile_top_films_owner_write
  ON public.profile_top_films FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_holiday_bucket_list_public_read
  ON public.profile_holiday_bucket_list FOR SELECT
  USING (true);
CREATE POLICY profile_holiday_bucket_list_owner_write
  ON public.profile_holiday_bucket_list FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_social_links_public_read
  ON public.profile_social_links FOR SELECT
  USING (true);
CREATE POLICY profile_social_links_owner_write
  ON public.profile_social_links FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_reading_list_public_read
  ON public.profile_reading_list FOR SELECT
  USING (true);
CREATE POLICY profile_reading_list_owner_write
  ON public.profile_reading_list FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_block_settings_public_read
  ON public.profile_block_settings FOR SELECT
  USING (true);
CREATE POLICY profile_block_settings_owner_write
  ON public.profile_block_settings FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_block_order_public_read
  ON public.profile_block_order FOR SELECT
  USING (true);
CREATE POLICY profile_block_order_owner_write
  ON public.profile_block_order FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);