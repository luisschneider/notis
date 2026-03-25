-- Standardize public.profiles to snake_case columns.
-- This migration is idempotent and safely handles legacy camelCase/lowercase variants.

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles does not exist';
  end if;
end
$$;

-- Rename legacy columns when snake_case target does not exist yet.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'displayName'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'display_name'
  ) then
    execute 'alter table public.profiles rename column "displayName" to display_name';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'displayname'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'display_name'
  ) then
    execute 'alter table public.profiles rename column displayname to display_name';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatarUrl'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatar_url'
  ) then
    execute 'alter table public.profiles rename column "avatarUrl" to avatar_url';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatarurl'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatar_url'
  ) then
    execute 'alter table public.profiles rename column avatarurl to avatar_url';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'createdAt'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'created_at'
  ) then
    execute 'alter table public.profiles rename column "createdAt" to created_at';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'createdat'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'created_at'
  ) then
    execute 'alter table public.profiles rename column createdat to created_at';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'updatedAt'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'updated_at'
  ) then
    execute 'alter table public.profiles rename column "updatedAt" to updated_at';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'updatedat'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'updated_at'
  ) then
    execute 'alter table public.profiles rename column updatedat to updated_at';
  end if;
end
$$;

-- Ensure canonical snake_case columns exist.
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now());

-- Backfill from legacy columns if they still exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'displayName'
  ) then
    execute 'update public.profiles set display_name = coalesce(display_name, "displayName") where display_name is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'displayname'
  ) then
    execute 'update public.profiles set display_name = coalesce(display_name, displayname) where display_name is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatarUrl'
  ) then
    execute 'update public.profiles set avatar_url = coalesce(avatar_url, "avatarUrl") where avatar_url is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatarurl'
  ) then
    execute 'update public.profiles set avatar_url = coalesce(avatar_url, avatarurl) where avatar_url is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'createdAt'
  ) then
    execute 'update public.profiles set created_at = coalesce(created_at, "createdAt") where created_at is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'createdat'
  ) then
    execute 'update public.profiles set created_at = coalesce(created_at, createdat) where created_at is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updatedAt'
  ) then
    execute 'update public.profiles set updated_at = coalesce(updated_at, "updatedAt") where updated_at is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updatedat'
  ) then
    execute 'update public.profiles set updated_at = coalesce(updated_at, updatedat) where updated_at is null';
  end if;
end
$$;

-- Enforce canonical defaults/nullability.
update public.profiles set display_name = '' where display_name is null;
update public.profiles set created_at = timezone('utc', now()) where created_at is null;
update public.profiles set updated_at = timezone('utc', now()) where updated_at is null;

alter table public.profiles
  alter column display_name set default '',
  alter column display_name set not null,
  alter column created_at set default timezone('utc', now()),
  alter column created_at set not null,
  alter column updated_at set default timezone('utc', now()),
  alter column updated_at set not null;

-- Drop remaining legacy columns if present.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'displayName'
  ) then
    execute 'alter table public.profiles drop column "displayName"';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'displayname'
  ) then
    execute 'alter table public.profiles drop column displayname';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatarUrl'
  ) then
    execute 'alter table public.profiles drop column "avatarUrl"';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatarurl'
  ) then
    execute 'alter table public.profiles drop column avatarurl';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'createdAt'
  ) then
    execute 'alter table public.profiles drop column "createdAt"';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'createdat'
  ) then
    execute 'alter table public.profiles drop column createdat';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updatedAt'
  ) then
    execute 'alter table public.profiles drop column "updatedAt"';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updatedat'
  ) then
    execute 'alter table public.profiles drop column updatedat';
  end if;
end
$$;

-- Ensure updated_at trigger behavior is canonical.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_updated_at_trigger on public.profiles;
create trigger profiles_updated_at_trigger
before update on public.profiles
for each row
execute function public.touch_updated_at();
