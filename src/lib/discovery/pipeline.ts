import { normalizeName } from "@/lib/nameNormalize";
import { walkSimilarityGraph, DEFAULT_GRAPH_LIMITS } from "./similarityGraph";
import { fetchTagCandidates, DEFAULT_TAG_CANDIDATE_LIMITS } from "./tagCandidates";
import { fetchAndFilterByTags } from "./tagFilter";
import { annotateWithListeners } from "./annotateListeners";
import { filterByObscurity } from "./obscurityFilter";
import { resolveTracksWithPreviews } from "./resolveTracks";
import { sampleWeightedByObscurity } from "./sampler";
import type { CandidateArtist, DiscoveryDeps, DiscoveryParams, DiscoveryResult } from "./types";

const DEFAULT_RESULT_COUNT = 24;

function dedupeCandidates(candidates: CandidateArtist[]): CandidateArtist[] {
  const seen = new Map<string, CandidateArtist>();
  for (const c of candidates) {
    const key = normalizeName(c.name);
    if (key && !seen.has(key)) seen.set(key, c);
  }
  return Array.from(seen.values());
}

/**
 * Full discovery pipeline, no Spotify/login involved anywhere:
 *
 *   tag charts (genre/mood) ─┐
 *                            ├─> merge/dedupe ─> tag filter ─> listener
 *   seed-artist similarity ──┘    lookup ─> obscurity filter ─> resolve
 *   graph walk (optional)         to real tracks + Deezer previews ─>
 *                                 weighted-random sample
 *
 * Seed artists and genre/mood tags are both optional inputs but at least
 * one must be present (enforced by the route handler's request schema) —
 * an empty pipeline has nothing to search from.
 * Each stage degrades gracefully (skips failing nodes) rather than failing
 * the whole request on a single upstream error, and every stage that fans
 * out one request per candidate (tag filter, listener lookup, track
 * resolution) runs those requests concurrently, bounded, internally.
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
          DEFAULT_TAG_CANDIDATE_LIMITS
        )
      : Promise.resolve([]),
    params.seedArtists.length > 0
      ? walkSimilarityGraph(params.seedArtists, deps.getSimilarArtists, DEFAULT_GRAPH_LIMITS)
      : Promise.resolve([]),
  ]);

  const candidates = dedupeCandidates([...tagCandidates, ...similarityCandidates]);

  const selectedTags = [...params.genreTags, ...params.moodTags];
  const tagged = await fetchAndFilterByTags(candidates, selectedTags, deps.getTopTags);

  // Listener lookups + obscurity filtering happen at the artist level,
  // before the more expensive per-track resolution stage, so we don't waste
  // Last.fm/Deezer calls resolving tracks for artists we're about to drop.
  const withListeners = await annotateWithListeners(tagged, deps.getArtistInfo);
  const withinObscurity = filterByObscurity(withListeners, params.obscuritySlider);

  const resolved = await resolveTracksWithPreviews(withinObscurity, {
    getTopTracksForArtist: deps.getTopTracksForArtist,
    findTrackPreview: deps.findTrackPreview,
  });

  return sampleWeightedByObscurity(resolved, params.resultCount ?? DEFAULT_RESULT_COUNT, deps.rng);
}
