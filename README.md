# Deep Cuts

Spotify's own "made for you" recommendations rarely surface anything you
haven't already brushed up against. This app lets you pick genres, moods,
and (optionally) a few seed artists, choose how obscure you want to go, and
get back a grid of tracks with playable 30-second previews — no login, no
account linking.

## Why there's no Spotify integration

Spotify has frozen new developer app creation dashboard-wide since early
2026 ("New integrations are currently on hold while we make updates to
improve reliability and performance") with no timeline given — see the
[Spotify Community megathread](https://community.spotify.com/t5/Spotify-for-Developers/New-integrations-are-currently-on-hold/td-p/7296575).
That made a Spotify-account-based version of this app a dead end, so it's
built entirely on APIs that don't require creating a new app:

- **[Last.fm](https://www.last.fm/api)** (free, keyless-friction API — just
  a registered key, no app-review process) supplies artist search,
  similar-artist graphs, genre/mood folksonomy tags, top-tracks-per-artist,
  and listener counts (our obscurity signal, in place of Spotify's old
  popularity score).
- **[Deezer](https://developers.deezer.com/api)**'s public search endpoint
  is fully keyless and returns a real 30-second preview-mp3 URL per track,
  which is what powers the inline players on the results grid.

There's no database and no auth — nothing to log into, nothing stored
server-side. The only thing that persists is the last search's params/results
in your browser's `localStorage`, purely so the results page survives a
refresh and "regenerate" can resubmit the same query.

## How discovery works

1. **Candidates** come from two optional, combinable sources: Last.fm's
   tag charts for any genre/mood tags you pick, and a similarity-graph walk
   outward from up to 5 seed artists you type in. At least one of the two
   is required.
2. **Tag filtering** narrows the combined pool to artists actually carrying
   your selected genre/mood tags.
3. **Obscurity filtering** drops anything above the listener-count ceiling
   your slider implies (log-scaled — Last.fm listener counts span from
   dozens to tens of millions).
4. **Track resolution** pulls each surviving artist's top tracks from
   Last.fm, then resolves each to a Deezer preview; anything without a
   preview match is dropped.
5. **Weighted-random sampling** picks the final ~24 tracks, biased toward
   lower listener counts but genuinely randomized run to run (with a cap on
   how many tracks one artist can contribute), which is what "regenerate"
   demonstrates.

## Setup

1. **Last.fm API key** — free at
   [last.fm/api/account/create](https://www.last.fm/api/account/create).
2. Copy `.env.local.example` to `.env.local` and fill in `LASTFM_API_KEY`.
   (Deezer needs no key at all.)
3. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000`.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Vitest unit tests (pure discovery-pipeline logic, no live API calls)

## Deploying (GitHub → Vercel)

1. Push this repo to GitHub.
2. Import it in the [Vercel dashboard](https://vercel.com/new) — it
   auto-detects Next.js.
3. Add `LASTFM_API_KEY` in Vercel's Project Settings → Environment Variables.
4. Every push to `main` auto-deploys, previews included — no redirect-URI
   registration or per-environment config needed, since there's no OAuth.

## Project layout

- `src/lib/lastfm/` — artist search, similarity graph, tags, top-tracks,
  listener counts
- `src/lib/deezer/` — preview-track lookup
- `src/lib/discovery/` — the actual discovery pipeline (tag/seed candidate
  generation → merge → tag filter → listener lookup → obscurity filter →
  track+preview resolution → weighted-random sample), each stage a pure,
  independently tested function
- `src/app/api/` — `artist-search` (type-ahead) and `discover` (runs the
  pipeline) route handlers
- `src/app/{questionnaire,results}/` — the two pages of the flow
