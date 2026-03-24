# Notis — Build Spec for Cursor Agent

## What is Notis?

Notis is a **personal digital notice board** — a single page where someone can show what they're reading, listening to, where they are, and what they're thinking. Think Linktree, but for real people rather than creators/influencers. The vibe is personal, curated, and low-effort to maintain.

Public profiles live at `notis.app/u/username` (path-based routing).

---

## Existing Project State

This is an **existing** Next.js + Supabase project using:
- Next.js (App Router)
- Supabase (auth + database)
- shadcn/ui components
- Tailwind CSS

There are some existing pages, components, and partial widget implementations on other branches, but **ignore those entirely**. The `main` branch is a clean `create-next-app` scaffold. Build everything from scratch on `main`.

The Supabase database has an existing schema from earlier prototyping. **Drop all existing tables, functions, triggers, and policies** and recreate everything from scratch based on this spec. Use `supabase db reset` or write a migration that cleans house first.

---

## Architecture Overview

### Core Concepts

- **User** — has an account, a username, and a board
- **Board** — a user's public-facing page at `/u/{username}`, composed of widgets
- **Widget** — a self-contained block on the board that shows something (Spotify history, reading list, location, etc.)
- **Widget Instance** — a specific widget placed on a user's board, with config and position data

### Tech Decisions

- **Mobile-first design** — all layouts start from mobile, scale up
- **Server components by default** — use client components only when you need interactivity
- **API routes for third-party integrations** — never expose API keys to the client
- **Supabase for everything** — auth, database, row-level security
- Use existing libraries and tools (npm packages, shadcn components) rather than building from scratch

---

## Database Schema

Design the Supabase schema with these tables. Use UUIDs for primary keys. Add RLS policies so users can only edit their own data, but anyone can read public boards.

### `profiles`
Extends Supabase auth.users. Created via trigger on user signup.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK to auth.users, PK |
| username | text | unique, lowercase, URL-safe (regex: `^[a-z0-9_-]{3,30}$`) |
| display_name | text | |
| bio | text | nullable |
| avatar_url | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `widget_instances`
Each row is a widget placed on someone's board.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to profiles |
| widget_type | text | granular type identifier, e.g. `spotify_recent_tracks`, `spotify_top_artists`, `github_pinned_repos`, `text_bio`, `location_current` |
| position | integer | ordering on the board (0-indexed), used for mobile stack order and as fallback |
| config | jsonb | widget-specific settings (API credentials, display prefs) |
| data | jsonb | cached widget data (last fetched results) |
| is_visible | boolean | default true |
| last_synced_at | timestamptz | nullable, when data was last refreshed |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `reading_list_items`
For the reading list widget — manual entries.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to profiles |
| widget_instance_id | uuid | FK to widget_instances |
| title | text | |
| url | text | nullable |
| author | text | nullable |
| description | text | nullable, short user note |
| item_type | text | `article`, `book`, `podcast`, `video`, `other` |
| added_at | timestamptz | |

### `connected_accounts`
Stores OAuth tokens for third-party services.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to profiles |
| provider | text | `spotify`, `github`, `twitter` |
| access_token | text | encrypted |
| refresh_token | text | encrypted, nullable |
| expires_at | timestamptz | nullable |
| provider_user_id | text | |
| created_at | timestamptz | |

**Token encryption:**
- Enable Supabase's `pgcrypto` extension (`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)
- Encrypt `access_token` and `refresh_token` at the application level before storing, using `pgp_sym_encrypt(token, key)` with a server-side encryption key stored in an environment variable (`TOKEN_ENCRYPTION_KEY`)
- Decrypt with `pgp_sym_decrypt(encrypted_token, key)` when reading tokens server-side
- Never return raw tokens to the client — all token usage happens in API routes

**RLS policies:**
- `connected_accounts`: only the owning user can read/write (never public)
- `profiles`: anyone can read, only owner can update
- `widget_instances`: anyone can read (for public boards), only owner can write
- `reading_list_items`: anyone can read, only owner can write

---

## Widget System

### Widget Architecture

The system has two levels: **providers** (Spotify, GitHub, etc.) and **widgets** (individual display components within a provider). Multiple widgets can share one provider's API connection.

**Per provider:**
- **An API integration** (`/lib/providers/[provider].ts`) — shared OAuth, token refresh, data fetching logic
- **An API route** (`/app/api/widgets/[provider]/route.ts`) — handles sync, OAuth callbacks, etc.

**Per widget type:**
1. **A display component** (`/components/widgets/[type]-widget.tsx`) — renders the widget on the public board. Server component where possible. **Must be designed for its registry-defined grid size** — e.g., a `1×2` Spotify widget has room for 5 tracks, while a `1×1` widget is compact.
2. **A settings component** (`/components/widgets/[type]-settings.tsx`) — rendered in the dashboard for configuration. Client component.
3. **A type definition** (`/lib/widgets/types.ts`) — TypeScript types for the widget's config and data shapes.

Create a **widget registry** (`/lib/widgets/registry.ts`) that maps `widget_type` string → display component, settings component, provider, icon, display name, description, and **grid size** (`gridWidth` and `gridHeight`, each 1 or 2). Grid sizes are a product design decision defined here — users do not control them. This is the single source of truth for what widgets exist and how they render on the bento grid.

### Important: Widget Variety

Each provider (Spotify, GitHub, etc.) can support **multiple widget types**, not just one. The examples below are starting points — you should look at each provider's API and build as many distinct, useful widgets as you can. A user might want to show their top artists AND their recently played tracks as two separate widgets on their board. The `widget_type` field in the database should reflect this granularity (e.g., `spotify_recent_tracks`, `spotify_top_artists`, not just `spotify`).

When designing widgets, think about what's interesting to show on a personal page. What would someone's friend want to glance at? What's fun, personal, or says something about who you are?

---

### Provider: Spotify

**Integration:**
- Uses Spotify Web API
- Requires OAuth 2.0 with PKCE flow
- Request generous scopes: `user-read-recently-played`, `user-top-read`, `user-read-currently-playing`, `user-library-read`
- Store tokens in `connected_accounts`
- Build the OAuth callback at `/api/auth/callback/spotify`
- Create data refresh endpoints at `/api/widgets/spotify/sync`
- See the **Data Refresh Strategy** section for how/when syncing is triggered

**Example widgets (build all of these, and add more if the API supports it):**
- **Recently Played** — last 5 tracks with album art, track name, artist
- **Top Artists** — user's top 5 artists (short/medium/long-term, configurable) with images
- **Top Tracks** — user's most-played tracks over a time period
- **Now Playing** — currently playing track, or "nothing playing" state. Could show album art large.

Look at the Spotify Web API docs and implement any other widgets that would make sense on a personal board (e.g., saved albums, playlists, etc.).

---

### Provider: Substack

**Integration:**
- Substack exposes an RSS feed at `https://{publication}.substack.com/feed`
- No OAuth needed — user just enters their Substack publication name in settings
- Parse the RSS feed server-side using a library like `rss-parser`
- Cache parsed results in the widget's `data` column
- See the **Data Refresh Strategy** section for refresh timing

**Example widgets:**
- **Latest Posts** — last 3 posts with title, date, and excerpt
- **Featured Post** — single pinned post displayed prominently (user picks which one)

---

### Provider: Reading List (Manual)

**Integration:**
- No third-party API — fully manual via dashboard
- CRUD operations on `reading_list_items` table
- In the dashboard, provide a form: title, URL, author, short description, type (article/book/podcast/video/other)
- When a URL is entered, attempt to auto-fill title and description using Open Graph meta tags (fetch server-side at `/api/widgets/reading-list/og-fetch`)

**Example widgets:**
- **Reading List** — a curated list of things the user has read and found interesting, with type icons, titles (linked), authors, and short notes. Most recent first.
- **Currently Reading** — a smaller widget showing 1-2 items the user is reading right now (book with cover art, long article, etc.)

---

### Provider: Twitter/X

**Integration:**
- The X/Twitter API (v2) is expensive and access is restricted. **Implement this pragmatically:**
  - **Primary approach:** Use Twitter's oEmbed endpoint (`https://publish.twitter.com/oembed`) which is free and unauthenticated — the user provides tweet URLs manually, and you render embeds.
  - **If you do use the official API:** use OAuth 2.0 with PKCE, scope `tweet.read users.read`, endpoint `GET /2/users/:id/tweets`
  - Store the user's Twitter handle in config at minimum
- For v1, it's acceptable to have the user manually paste tweet URLs in the dashboard

**Example widgets:**
- **Recent Tweets** — last 3-5 tweets rendered as embedded cards
- **Pinned Tweet** — single featured tweet displayed prominently

---

### Provider: Location (Manual)

**Integration:**
- No API needed — fully manual. User types their current location in the dashboard.
- Optional: use a simple geocoding lookup (free tier of OpenCage, Nominatim, or similar) to validate the input and get a country code for the flag emoji
- User updates this manually whenever they travel

**Example widgets:**
- **Current Location** — minimal display: pin icon, city/country, flag emoji
- **Map** — small static or interactive map centered on the user's location (use a free tile service)

---

### Provider: GitHub

**Integration:**
- GitHub's public API doesn't require OAuth for public data
- Use `GET https://api.github.com/users/{username}/events/public` for recent activity
- Use `GET https://api.github.com/users/{username}/repos?sort=updated` for repos
- User enters their GitHub username in settings
- Cache results in `data` column — see the **Data Refresh Strategy** section for refresh timing

**Example widgets (build all of these, and add more if the API supports it):**
- **Recent Activity** — last 5 events (pushed to X, starred Y, opened PR on Z) with relative timestamps
- **Pinned Repos** — top repos with name, description, stars, and language dot
- **Contribution Graph** — the green squares heatmap, or a simplified version of it

Look at the GitHub API and implement any other widgets that would make sense (e.g., gist list, follower count, etc.).

---

### Provider: Custom Text

**Integration:**
- No API — user writes content in a textarea in the dashboard
- Support basic markdown (bold, italic, links, line breaks) — render with a lightweight markdown renderer like `react-markdown`
- Have a title field and a body field

**Example widgets:**
- **Bio / About Me** — free-form markdown content in a card
- **Links** — a simple list of labeled URLs (like a mini Linktree within the board)
- **Quote** — a styled quote or motto with optional attribution

---

### Adding More Widgets

The widget system should be designed so adding a new widget is straightforward: create the display + settings components, add an entry to the registry, and it works. If you see opportunities for other useful widgets beyond what's listed here — whether from these providers or new ones — go ahead and build them. The goal is a rich set of building blocks that make each person's board feel unique.

---

## OAuth Token Refresh

Spotify access tokens expire after 1 hour. Twitter tokens also expire. The app **must** handle token refresh automatically — without this, boards break shortly after connecting.

- Build a shared `refreshToken(connectedAccount)` utility in `/lib/providers/oauth.ts`
- Before any API call to a provider, check if `connected_accounts.expires_at` is in the past (or within 5 minutes of expiring). If so, use the `refresh_token` to get a new `access_token` and update the row in `connected_accounts`.
- If the refresh token itself has expired or been revoked, mark the connected account as needing re-authentication and show a "Reconnect [Provider]" prompt in the dashboard.
- All token refresh happens server-side in API routes — never on the client.

---

## Data Refresh Strategy

Widget data should feel fresh without making visitors wait for API calls.

**Background refresh (preferred):**
- Use a **Supabase cron job** (via `pg_cron` or Supabase Edge Functions with a cron trigger) that runs every 10–15 minutes
- The cron job queries `widget_instances` where `last_synced_at` is older than the widget's refresh threshold, then calls each provider's sync logic to update the `data` column
- This means the public board always serves pre-cached data instantly — no visitor ever triggers a slow API call

**Fallback (if cron isn't available):**
- When the public board is visited and `last_synced_at` is stale, **return the cached data immediately** and trigger an async background refresh (e.g., via a non-blocking `fetch` to the sync endpoint with `waitUntil` in an Edge Function, or a fire-and-forget server action). The visitor sees slightly stale data, but the next visitor gets fresh data. Never block page rendering on a sync.

**Refresh thresholds by provider (configurable in the provider config):**
- Spotify: 5 minutes (listening data changes often)
- GitHub: 15 minutes
- Substack: 30 minutes (RSS feeds update infrequently)
- Manual widgets (location, text, reading list): no auto-refresh needed

---

## Pages & Routes

### Public Routes (no auth required)

- `/u/[username]` — the public board. Fetch the user's profile + visible widget instances, render them in order. This is the core experience. Should be fast — use server components and cache aggressively. Return a 404 page if the username doesn't exist.
- `/` — landing page. Brief explanation of Notis, CTA to sign up, maybe a preview/demo board.

### Auth Routes

- `/login` — email/password + magic link login via Supabase Auth
- `/signup` — registration with username selection (validate uniqueness in real-time)
- `/auth/callback` — Supabase auth callback handler

### Dashboard Routes (auth required)

- `/dashboard` — overview of the user's board with a live preview
- `/dashboard/widgets` — manage widgets: reorder (drag-and-drop), toggle visibility, delete, and **add new widgets via a widget picker**.
  - The widget picker should be a modal or sheet, **grouped by provider** (Spotify, GitHub, etc.)
  - Each provider group shows its connection status: either "Connected" with a list of available widgets to add, or a "Connect [Provider]" button that starts the OAuth flow / asks for a username
  - Each widget in the picker shows its name, a short description, and a preview of its bento grid size
  - A user can add multiple widgets from the same provider (e.g., both "Recently Played" and "Top Artists" from Spotify)
- `/dashboard/widgets/[id]` — configure a specific widget instance
- `/dashboard/connections` — manage connected accounts (Spotify, GitHub, Twitter)
- `/dashboard/settings` — profile settings (username, display name, bio, avatar)

---

## UI/UX Guidelines

### Mobile-First Design

- **The public board must look great on a phone.** This is the primary viewport.
- **Mobile (<768px):** single column layout. All widgets stack vertically at full width, ordered by `position`. Widget `grid_width`/`grid_height` are ignored — everything is full-width and auto-height.
- **Desktop (≥768px):** bento grid layout (see below).
- Touch-friendly tap targets (min 44px)
- Fast load times — lazy load widget data below the fold

### Public Board Layout — Bento Grid

- **Header area:** avatar (circle), display name, bio. Centered on mobile, left-aligned on desktop.
- **Desktop grid:** use CSS Grid with **2 columns** and a consistent gap (e.g., `gap-4`).
  - Each widget's grid size is determined by its **widget type via the registry** — not by the user. The board renderer looks up `gridWidth` and `gridHeight` from the registry for each widget's type.
  - Use `grid-column: span X` and `grid-row: span Y` based on the registry-defined size.
  - Let CSS Grid's auto-placement algorithm (`grid-auto-flow: dense`) handle filling gaps — this creates the organic bento feel without needing complex manual positioning.
  - Widgets render in `position` order; the grid packs them densely.
- **Fixed sizes per widget type** (defined in the widget registry — assign sensible sizes based on content density):
  - Small/glanceable widgets (location, now playing, quote): 1×1
  - List widgets (recent tracks, top artists, reading list, pinned repos): 1×2
  - Content-heavy widgets (latest posts, featured post, recent tweets): 2×1
  - Rich/hero widgets (contribution graph, large bio): 2×2
  - Use your judgment for any additional widgets you create — the size should match how much content the widget needs to display
- Each widget is a card with subtle border/shadow, rounded corners
- Keep visual noise low — this should feel personal and calm, not like a dashboard
- **Footer:** small "Made with Notis" link

### Dashboard Layout

- Sidebar nav on desktop, bottom tab bar on mobile
- The widget management page should support **drag-and-drop reordering** — use `@dnd-kit/core` and `@dnd-kit/sortable` (already popular, works well with React)
- Show a live bento grid preview of the board alongside the editor on desktop — this should update in real-time as the user reorders, resizes, or toggles widgets

### Design System

- Use shadcn/ui components throughout — don't reinvent buttons, dialogs, inputs, etc.
- Stick to the existing Tailwind theme/colors unless the project has none configured, in which case pick a clean neutral palette with one accent color
- Typography: clean sans-serif, good hierarchy between widget titles and content
- Consistent spacing scale using Tailwind's default spacing

---

## API Routes Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/callback/spotify` | GET | Spotify OAuth callback |
| `/api/auth/callback/github` | GET | GitHub OAuth callback (if needed) |
| `/api/auth/callback/twitter` | GET | Twitter OAuth callback (if needed) |
| `/api/widgets/spotify/sync` | POST | Fetch & cache recent Spotify tracks |
| `/api/widgets/substack/sync` | POST | Fetch & cache Substack RSS feed |
| `/api/widgets/github/sync` | POST | Fetch & cache GitHub activity |
| `/api/widgets/reading-list/og-fetch` | POST | Fetch Open Graph data for a URL |
| `/api/widgets/[id]/reorder` | PATCH | Update widget positions |
| `/api/profile` | GET/PATCH | Get/update user profile |

---

## Environment Variables Needed

```env
# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify

# Twitter/X (optional — skip if using embed approach)
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# GitHub (optional — public API works without auth for low volume)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Token encryption (used with pgcrypto for connected_accounts)
TOKEN_ENCRYPTION_KEY=
```

---

## Implementation Order

Build in this sequence. Complete each step fully (including error states and loading states) before moving on.

### Phase 1: Foundation
1. Verify the clean `create-next-app` scaffold is working (`npm run dev`). Install core dependencies: shadcn/ui, Supabase client libraries, and any other foundational packages needed.
2. Set up the database schema (migrations via Supabase CLI or SQL). Include RLS policies.
3. Create the `profiles` table and the trigger that auto-creates a profile on auth.users insert.
4. Build the `/signup` flow with username selection (real-time uniqueness check).
5. Build the `/login` flow.
6. Build the `/dashboard/settings` page (edit profile: display name, bio, avatar upload to Supabase Storage).

### Phase 2: Widget System Core
7. Create the widget type definitions, registry, and the `widget_instances` table.
8. Build the `/dashboard/widgets` page — list current widgets, add new widgets from a picker, delete widgets, toggle visibility.
9. Implement drag-and-drop reordering of widgets.
10. Build the public board page (`/u/[username]`) — fetch profile + widgets, render in order.

### Phase 3: Widgets (one provider at a time)
Build all widgets for each provider before moving to the next. Start with the simplest providers (no API), then work up to OAuth flows.

11. **Custom Text provider** — simplest, no API. Build all text-based widgets (bio, links, quote, etc.).
12. **Location provider** — also simple, no API. Build all location widgets.
13. **Reading List provider** — build CRUD for reading list items, OG fetch endpoint, all reading list widgets.
14. **Substack provider** — RSS parsing, settings for publication name, all Substack widgets.
15. **GitHub provider** — public API fetch, settings for username, all GitHub widgets.
16. **Spotify provider** — full OAuth flow, token storage/refresh, sync endpoints, all Spotify widgets.
17. **Twitter/X provider** — embed approach first, all Twitter widgets.

### Phase 4: Polish
18. Landing page at `/`.
19. SEO: dynamic `<title>` and Open Graph meta tags on public boards (use Next.js `generateMetadata`).
20. Loading skeletons for all widgets.
21. Error boundaries for individual widgets (one widget failing shouldn't break the board).
22. Mobile responsiveness audit — test every page at 375px width.
23. Dark mode support using Tailwind's `dark:` variant and shadcn's theme system.

---

## Key Principles

- **Don't over-engineer.** This is a v1. Ship working features, not perfect abstractions.
- **Use existing packages** — `rss-parser` for RSS, `react-markdown` for markdown, `@dnd-kit` for drag-and-drop, `date-fns` for dates. Don't rebuild what exists.
- **Every API call to a third party happens server-side.** Never expose API keys or tokens to the client.
- **Graceful degradation** — if a widget's API is down or the user hasn't connected an account, show a helpful empty state, not an error.
- **Type everything.** Use TypeScript strictly — no `any` types, proper interfaces for all widget configs and data shapes.
