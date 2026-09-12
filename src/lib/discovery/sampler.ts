import type { ResolvedCandidateTrack } from "./types";

// One track per artist by default — with only ~10 final results (down from
// the original 24), letting one artist contribute 2 tracks eats a big chunk
// of a small list. A discovery app should surface more different artists,
// not more songs from the same one.
const DEFAULT_MAX_PER_ARTIST = 1;

/** Shared by both samplers below: A-ES weighted-reservoir key, biased toward lower listener counts. */
function weightedKey(listeners: number, rng: () => number): number {
  const weight = 1 / (listeners + 1);
  const u = rng();
  const safeU = u <= 0 ? Number.EPSILON : u;
  return Math.pow(safeU, 1 / weight);
}

/**
 * Weighted random sample of artists (not tracks) without replacement, same
 * obscurity bias as sampleWeightedByObscurity below. Used to pick a modest
 * subset of candidates to resolve previews for, rather than resolving every
 * obscurity-filtered candidate up front — the preview API is rate-limited
 * per source IP, so keeping per-search call volume down matters more here
 * than at the final track-selection step.
 */
export function sampleArtistsByObscurity<T extends { listeners: number }>(
  candidates: T[],
  count: number,
  rng: () => number = Math.random
): T[] {
  const keyed = candidates.map((item) => ({ item, key: weightedKey(item.listeners, rng) }));
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, count).map((k) => k.item);
}

/**
 * Weighted random sample without replacement, biased toward lower listener
 * counts (more obscure), with jitter so repeat runs against identical
 * inputs still vary — this is the "random and interesting, not a relevance
 * sort" requirement. Uses weighted reservoir sampling (A-ES algorithm):
 * each item gets a key = random()^(1/weight); take the top-N by key.
 *
 * Weight uses raw listener count (not a log-scaled version) — this is a
 * different concern from the obscurity slider's log-scale ceiling mapping
 * (obscurityFilter.ts): here we WANT the full dynamic range (listener
 * counts span ~50 to tens of millions) so the bias toward genuinely
 * obscure tracks is strong and legible, not compressed toward uniform.
 *
 * Also caps how many tracks from the same artist can land in one result
 * set (default 2) so one artist's whole catalog can't crowd out variety —
 * this replaces the old "dedupe against the user's library" step, which
 * no longer applies now that there's no logged-in account to compare against.
 *
 * `rng` defaults to Math.random but accepts an injected generator for
 * deterministic tests.
 */
export function sampleWeightedByObscurity<T extends ResolvedCandidateTrack>(
  candidates: T[],
  count: number,
  rng: () => number = Math.random,
  maxPerArtist: number = DEFAULT_MAX_PER_ARTIST
): T[] {
  const keyed = candidates.map((item) => ({ item, key: weightedKey(item.listeners, rng) }));

  keyed.sort((a, b) => b.key - a.key);

  const perArtistCount = new Map<string, number>();
  const selected: T[] = [];

  for (const { item } of keyed) {
    if (selected.length >= count) break;
    const artistKey = item.artistName.toLowerCase();
    const soFar = perArtistCount.get(artistKey) ?? 0;
    if (soFar >= maxPerArtist) continue;
    perArtistCount.set(artistKey, soFar + 1);
    selected.push(item);
  }

  return selected;
}
