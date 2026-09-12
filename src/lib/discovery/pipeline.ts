import { normalizeName } from "@/lib/nameNormalize";
import { walkSimilarityGraph, DEFAULT_GRAPH_LIMITS } from "./similarityGraph";
import { fetchTagCandidates, DEFAULT_TAG_CANDIDATE_LIMITS } from "./tagCandidates";
import { fetchAndFilterByTags } from "./tagFilter";
import { annotateWithListeners } from "./annotateListeners";
import { filterByObscurity } from "./obscurityFilter";
import { resolveTracksWithPreviews } from "./resolveTracks";
import { sampleArtistsByObscurity, sampleWeightedByObscurity } from "./sampler";
import type {
  CandidateArtist,
  CandidateWithListeners,
  DiscoveryDeps,
  DiscoveryParams,
  DiscoveryResult,
  ResolvedCandidateTrack,
} from "./types";

const DEFAULT_RESULT_COUNT = 10;

// How many artists to try resolving previews for per round, relative to how
// many final results we still need. A buffer over 1x since not every
// artist's top tracks will have an iTunes preview match. Kept modest (rather
// than resolving every obscurity-filtered candidate up front, as this used
// to) because the iTunes Search API is keyless and rate-limited per source
// IP — see itunes/client.ts — so a single search fanning out 100+ calls at
// once is exactly what trips that limit.
const RESOLUTION_BATCH_MULTIPLIER = 1.5;
const TRACKS_PER_ARTIST = 2;

function dedupeCandidates(candidates: CandidateArtist[]): CandidateArtist[] {
  const seen = new Map<string, CandidateArtist>();
  for (const c of candidates) {
    const key = normalizeName(c.name);
    if (key && !seen.has(key)) seen.set(key, c);
  }
  return Array.from(seen.values());
}

/**
 * Resolves previews for a growing subset of `pool` until either enough
 * tracks have survived to fill `resultCount` or the pool is exhausted —
 * rather than resolving the whole pool unconditionally. Each round pulls a
 * fresh weighted-random batch of artists not yet tried, so a low iTunes
 * hit-rate on the first batch is backfilled from the rest of the pool
 * instead of just returning fewer results than requested.
 */
async function resolveWithBackfill(
  pool: CandidateWithListeners[],
  resultCount: number,
  deps: DiscoveryDeps
): Promise<ResolvedCandidateTrack[]> {
  let remaining = pool;
  const resolved: ResolvedCandidateTrack[] = [];

  while (resolved.length < resultCount && remaining.length > 0) {
    const batchSize = Math.min(remaining.length, Math.ceil(resultCount * RESOLUTION_BATCH_MULTIPLIER));
    const batch = sampleArtistsByObscurity(remaining, batchSize, deps.rng);
    const batchKeys = new Set(batch.map((c) => normalizeName(c.name)));
    remaining = remaining.filter((c) => !batchKeys.has(normalizeName(c.name)));

    const newlyResolved = await resolveTracksWithPreviews(
      batch,
      { getTopTracksForArtist: deps.getTopTracksForArtist, findTrackPreview: deps.findTrackPreview },
      TRACKS_PER_ARTIST
    );
    resolved.push(...newlyResolved);
  }

  return resolved;
}

/**
 * Full discovery pipeline, no Spotify/login involved anywhere:
 *
 *   tag charts (genre/mood) ─┐
 *                            ├─> merge/dedupe ─> tag filter ─> listener
 *   seed-artist similarity ──┘    lookup ─> obscurity filter ─> resolve
 *   graph walk (optional)         to real tracks + iTunes previews ─>
 *                                 weighted-random sample
 *
 * Seed artists and genre/mood tags are both optional inputs but at least
 * one must be present (enforced by the route handler's request schema) —
 * an empty pipeline has nothing to search from.
 * Each stage degrades gracefully (skips failing nodes) rather than failing
 * the whole request on a single upstream error, and every stage that fans
 * out one request per candidate (tag filter, listener lookup, track
 * resolution) runs those requests concurrently, bounded, internally.
 *
 * Candidate *fetching* itself is randomized (tagCandidates' page selection,
 * similarityGraph's per-node sampling), not just the final sample — Last.fm's
 * tag charts and similar-artist lists are fixed, deterministically-ranked
 * data, so without that, identical searches (or clicking "Regenerate" on the
 * results page) would always draw from the same handful of artists no
 * matter how randomized the final selection step was.
 */
export async function runDiscoveryPipeline(
  params: DiscoveryParams,
  deps: DiscoveryDeps
): Promise<DiscoveryResult[]> {
  const [tagCandidates, similarityCandidates] = await Promise.all([
    params.genreTags.length + params.moodTags.length > 0
      ? fetchTagCandidates(
          [...params.genreTags, ...params.moodTags],
          deps.getTopArtistsForTag,
          DEFAULT_TAG_CANDIDATE_LIMITS,
          deps.rng
        )
      : Promise.resolve([]),
    params.seedArtists.length > 0
      ? walkSimilarityGraph(
          params.seedArtists,
          deps.getSimilarArtists,
          DEFAULT_GRAPH_LIMITS,
          deps.rng
        )
      : Promise.resolve([]),
  ]);

  const candidates = dedupeCandidates([...tagCandidates, ...similarityCandidates]);

  const selectedTags = [...params.genreTags, ...params.moodTags];
  const tagged = await fetchAndFilterByTags(candidates, selectedTags, deps.getTopTags);

  // Listener lookups + obscurity filtering happen at the artist level,
  // before the more expensive per-track resolution stage, so we don't waste
  // Last.fm/iTunes calls resolving tracks for artists we're about to drop.
  const withListeners = await annotateWithListeners(tagged, deps.getArtistInfo);
  const withinObscurity = filterByObscurity(withListeners, params.obscuritySlider);

  const resultCount = params.resultCount ?? DEFAULT_RESULT_COUNT;
  const resolved = await resolveWithBackfill(withinObscurity, resultCount, deps);

  console.log(
    `[runDiscoveryPipeline] candidates=${candidates.length} tagged=${tagged.length} withListeners=${withListeners.length} withinObscurity=${withinObscurity.length} resolved=${resolved.length}`
  );

  return sampleWeightedByObscurity(resolved, resultCount, deps.rng);
}
