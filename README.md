# Deep Cuts

Spotify's own "made for you" recommendations rarely surface anything you
haven't already brushed up against. This app authenticates your Spotify
account (read-only, minimal scopes), asks a short questionnaire (seed
artists, an obscurity slider, genre/mood tags), and returns tracks biased
toward lesser-known music related to what you actually listen to.

## Why it doesn't use Spotify's own recommendation engine

Any Spotify developer app created after Nov 27, 2024 permanently loses
access to `/recommendations`, `/audio-features`, `/audio-analysis`, and
`/artists/{id}/related-artists` — there's no replacement. So this app builds
its own discovery layer: Spotify still provides auth, your real listening
history, and `popularity` scores (the obscurity signal); **Last.fm** (free,
non-commercial API) supplies the similar-artist graph and genre/mood tags
Spotify no longer exposes.

There's no database — session tokens live in an encrypted httpOnly cookie,
and questionnaire/result state lives in your browser's `localStorage`.

## Setup

1. **Spotify app** — create one at the
   [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
   Under its settings, add these exact redirect URIs:
   - `http://127.0.0.1:3000/api/auth/callback` (local dev — Spotify requires
     `127.0.0.1`, not `localhost`)
   - `https://<your-production-domain>/api/auth/callback` (once deployed)

2. **Last.fm API key** — grab one free at
   [last.fm/api/account/create](https://www.last.fm/api/account/create).

3. **Env vars** — copy `.env.local.example` to `.env.local` and fill in:
   `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`,
   `LASTFM_API_KEY`, `SESSION_SECRET` (generate with `openssl rand -base64 32`).

4. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://127.0.0.1:3000`.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Vitest unit tests (pure discovery-pipeline logic, no live API calls)

## Deploying (GitHub → Vercel)

1. Push this repo to GitHub.
2. Import it in the [Vercel dashboard](https://vercel.com/new) — it
   auto-detects Next.js.
3. Add the same env vars from `.env.local` in Vercel's Project Settings →
   Environment Variables, with `SPOTIFY_REDIRECT_URI` pointed at your
   production domain.
4. Add that production redirect URI to the Spotify app's settings too.
5. Every push to `main` auto-deploys. Note: Vercel preview-deployment URLs
   are dynamic per-deploy and won't match a registered Spotify redirect URI,
   so OAuth only fully works on production + local dev for now — not PR
   previews.

## Project layout

- `src/lib/spotify/` — OAuth2 (Authorization Code + PKCE) and API client
- `src/lib/lastfm/` — similar-artist graph + tag lookups
- `src/lib/discovery/` — the actual discovery pipeline (seed extraction →
  similarity walk → tag filter → Spotify cross-reference → obscurity filter
  → dedupe → weighted-random sample), each stage a pure, independently
  tested function
- `src/app/api/` — route handlers wiring the above together
- `src/app/{login,questionnaire,results}/` — the three pages of the flow
