# AGENTS.md

## Cursor Cloud specific instructions

### Product Overview
Next.js + Supabase Starter Kit — a full-stack auth template using Next.js App Router with Supabase for authentication (sign-up, login, forgot-password, update-password, OTP confirmation). No custom database tables or migrations.

### Required Environment Variables
The app requires two env vars in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

These are injected as VM secrets. The `.env.local` file must be created before the app will function beyond showing a "connect to Supabase" tutorial page.

### Running the App
- **Dev server**: `npm run dev` (port 3000)
- **Build**: `npm run build`
- **Lint**: `npm run lint` (pre-existing lint error in `tailwind.config.ts` — `@typescript-eslint/no-require-imports` on a `require()` call; this is in the upstream template)
- **No test framework** is configured in this repo.

### Gotchas
- Supabase rejects sign-ups with `example.com` email domains. Use real-looking email addresses for testing auth flows.
- The app uses `npm` (has `package-lock.json`); do not use pnpm/yarn.
- The Supabase project must have email auth enabled (it is by default).
