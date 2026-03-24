-- Notis Phase 1 foundational schema reset and recreation.
create extension if not exists pgcrypto;

-- Drop policies before dropping tables.
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

drop policy if exists "widget_instances_select_public" on public.widget_instances;
drop policy if exists "widget_instances_insert_own" on public.widget_instances;
drop policy if exists "widget_instances_update_own" on public.widget_instances;
drop policy if exists "widget_instances_delete_own" on public.widget_instances;

drop policy if exists "reading_list_select_public" on public.reading_list_items;
drop policy if exists "reading_list_insert_own" on public.reading_list_items;
drop policy if exists "reading_list_update_own" on public.reading_list_items;
drop policy if exists "reading_list_delete_own" on public.reading_list_items;

drop policy if exists "connected_accounts_select_own" on public.connected_accounts;
drop policy if exists "connected_accounts_insert_own" on public.connected_accounts;
drop policy if exists "connected_accounts_update_own" on public.connected_accounts;
drop policy if exists "connected_accounts_delete_own" on public.connected_accounts;

-- Drop tables and functions from any prior prototype.
drop table if exists public.reading_list_items cascade;
drop table if exists public.widget_instances cascade;
drop table if exists public.connected_accounts cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.touch_updated_at() cascade;

delete from storage.objects where bucket_id = 'avatars';
delete from storage.buckets where id = 'avatars';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  bio text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint username_format check (username ~ '^[a-z0-9_-]{3,30}$')
);

create table public.widget_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  widget_type text not null,
  position integer not null check (position >= 0),
  config jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  is_visible boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.reading_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  widget_instance_id uuid not null references public.widget_instances (id) on delete cascade,
  title text not null,
  url text,
  author text,
  description text,
  item_type text not null check (item_type in ('article', 'book', 'podcast', 'video', 'other')),
  added_at timestamptz not null default timezone('utc', now())
);

create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('spotify', 'github', 'twitter')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  provider_user_id text not null,
  needs_reauth boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, provider)
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create index widget_instances_user_id_position_idx
  on public.widget_instances (user_id, position);

create index reading_list_items_widget_instance_id_idx
  on public.reading_list_items (widget_instance_id, added_at desc);

create index connected_accounts_user_provider_idx
  on public.connected_accounts (user_id, provider);

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_updated_at_trigger
before update on public.profiles
for each row
execute function public.touch_updated_at();

create trigger widget_instances_updated_at_trigger
before update on public.widget_instances
for each row
execute function public.touch_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  generated_username text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  requested_username := regexp_replace(requested_username, '[^a-z0-9_-]', '', 'g');

  if requested_username ~ '^[a-z0-9_-]{3,30}$'
    and not exists(select 1 from public.profiles p where p.username = requested_username) then
    generated_username := requested_username;
  end if;

  if generated_username is not null then
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      generated_username,
      coalesce(new.raw_user_meta_data ->> 'display_name', '')
    );

    return new;
  end if;

  generated_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_-]', '', 'g'));

  if generated_username is null or length(generated_username) < 3 then
    generated_username := 'user_' || substring(replace(new.id::text, '-', '') from 1 for 12);
  end if;

  generated_username := substring(generated_username from 1 for 30);

  while exists(select 1 from public.profiles p where p.username = generated_username) loop
    generated_username := substring(generated_username from 1 for 24) || '_' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 5);
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, generated_username, coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.widget_instances enable row level security;
alter table public.reading_list_items enable row level security;
alter table public.connected_accounts enable row level security;

create policy "profiles_select_public"
on public.profiles
for select
to anon, authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

create policy "widget_instances_select_public"
on public.widget_instances
for select
to anon, authenticated
using (true);

create policy "widget_instances_insert_own"
on public.widget_instances
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "widget_instances_update_own"
on public.widget_instances
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "widget_instances_delete_own"
on public.widget_instances
for delete
to authenticated
using (auth.uid() = user_id);

create policy "reading_list_select_public"
on public.reading_list_items
for select
to anon, authenticated
using (true);

create policy "reading_list_insert_own"
on public.reading_list_items
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "reading_list_update_own"
on public.reading_list_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reading_list_delete_own"
on public.reading_list_items
for delete
to authenticated
using (auth.uid() = user_id);

create policy "connected_accounts_select_own"
on public.connected_accounts
for select
to authenticated
using (auth.uid() = user_id);

create policy "connected_accounts_insert_own"
on public.connected_accounts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "connected_accounts_update_own"
on public.connected_accounts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "connected_accounts_delete_own"
on public.connected_accounts
for delete
to authenticated
using (auth.uid() = user_id);

create policy "avatars_read_public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

create policy "avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Avatar storage bucket and object policies.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar_objects_select_public" on storage.objects;
drop policy if exists "avatar_objects_insert_own" on storage.objects;
drop policy if exists "avatar_objects_update_own" on storage.objects;
drop policy if exists "avatar_objects_delete_own" on storage.objects;

create policy "avatar_objects_select_public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

create policy "avatar_objects_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatar_objects_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatar_objects_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
