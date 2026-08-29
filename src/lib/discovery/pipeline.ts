import { walkSimilarityGraph, DEFAULT_GRAPH_LIMITS } from "./similarityGraph";
import { fetchAndFilterByTags } from "./tagFilter";
import { crossReferenceToSpotify } from "./crossReference";
import { filterByObscurity } from "./obscurityFilter";
import { dedupeAgainstLibrary } from "./dedupe";
import { sampleWeightedByObscurity } from "./sampler";
import type { DiscoveryDeps, DiscoveryParams, DiscoveryResult } from "./types";

const DEFAULT_RESULT_COUNT = 24;

/**
 * Runs a bounded async task pool so we never burst past a handful of
 * concurrent requests to Last.fm/Spotify at once (both have rate limits and
 * we have no cache layer to absorb retries).
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export interface LibraryForDedupe {
  trackIds: Set<string>;
  artistIds: Set<string>;
}

/**
 * Full discovery pipeline: seed -> Last.fm similarity graph -> tag filter ->
 * Spotify cross-reference -> obscurity filter -> dedupe -> weighted sample.
 * Each stage degrades gracefully (skips failing nodes) rather than failing
 * the whole request on a single upstream error.
 */
export async function runDiscoveryPipeline(
  params: DiscoveryParams,
  deps: DiscoveryDeps,
  library: LibraryForDedupe
): Promise<DiscoveryResult[]> {
  const candidates = await walkSimilarityGraph(
    params.seedArtists,
    deps.getSimilarArtists,
    DEFAULT_GRAPH_LIMITS
  );

  const selectedTags = [...params.genreTags, ...params.moodTags];
  const tagged = await fetchAndFilterByTags(candidates, selectedTags, deps.getTopTags);

  // Cross-reference is the most request-heavy stage (2 Spotify calls per
  // candidate) — throttle concurrency here specifically.
  const resolvedBatches = await mapWithConcurrency(
    // chunk into small groups so crossReferenceToSpotify's internal loop
    // still benefits from the outer concurrency cap
    chunk(tagged, 5),
    3,
    (batch) =>
      crossReferenceToSpotify(batch, {
        searchArtistByName: deps.searchArtistByName,
        searchTracksByArtist: deps.searchTracksByArtist,
      })
  );
  const resolved = resolvedBatches.flat();

  const withinObscurity = filterByObscurity(resolved, params.obscurityMax);
  const deduped = dedupeAgainstLibrary(withinObscurity, library);
  const sampled = sampleWeightedByObscurity(
    deduped,
    params.resultCount ?? DEFAULT_RESULT_COUNT,
    deps.rng
  );

  return sampled;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
