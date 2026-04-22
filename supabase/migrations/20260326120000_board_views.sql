-- Board views analytics table.
create table public.board_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default timezone('utc', now()),
  username_viewed text not null,
  referrer text,
  country text
);

create index board_views_profile_id_viewed_at_idx
  on public.board_views (profile_id, viewed_at desc);

create index board_views_username_viewed_idx
  on public.board_views (username_viewed);

alter table public.board_views enable row level security;

-- Anyone (including anon) can insert views for tracking.
create policy "board_views_insert_anon"
on public.board_views
for insert
to anon, authenticated
with check (true);

-- Authenticated users can only read their own views.
create policy "board_views_select_own"
on public.board_views
for select
to authenticated
using (profile_id = auth.uid());
