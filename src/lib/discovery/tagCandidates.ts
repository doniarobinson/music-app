import { mapWithConcurrency } from "@/lib/concurrency";
import { normalizeName } from "@/lib/nameNormalize";
import type { CandidateArtist } from "./types";

type GetTopArtistsForTagFn = (tag: string, page: number, limit?: number) => Promise<string[]>;

export interface TagCandidateLimits {
  /** How many pages to pull per tag (1 guaranteed page-1 fetch + this many extra randomized ones). */
  pagesPerTag: number;
  artistsPerPage: number;
  maxCandidates: number;
  /** Widest page index to randomly draw the extra pages from. */
  maxPageIndex: number;
}

const DEFAULT_CONCURRENCY = 6;

// Kept modest on purpose: every candidate here still needs a listener
// lookup and (if it survives) a top-tracks + Deezer-preview resolution —
// 80 candidates is already generous headroom for a ~24-track final sample,
// and keeps a full discovery run from taking well over a minute.
export const DEFAULT_TAG_CANDIDATE_LIMITS: TagCandidateLimits = {
  pagesPerTag: 3,
  artistsPerPage: 20,
  maxCandidates: 80,
  // Widened from an initial 15 after measuring real repeat-query overlap —
  // a narrower range still collided across runs often enough to feel
  // repetitive. This costs nothing extra in API call count (still
  // pagesPerTag fetches per tag), just draws from more of the chart.
  maxPageIndex: 30,
};

function pickRandomPages(count: number, maxPageIndex: number, rng: () => number): number[] {
  // Page 1 is always included as a reliability floor (guaranteed non-empty
  // for virtually any real tag); the rest are randomized so repeated
  // identical requests don't always draw from the exact same slice.
  const pages = new Set<number>([1]);
  const upperBound = Math.max(2, maxPageIndex);
  let attempts = 0;
  // Bounded attempts guards against an infinite loop if maxPageIndex is
  // small enough that unique pages run out before `count` is reached.
  while (pages.size < count && attempts < count * 10) {
    pages.add(2 + Math.floor(rng() * (upperBound - 1)));
    attempts++;
  }
  return Array.from(pages);
}

/**
 * Pulls candidate artists directly from Last.fm's tag charts — this is the
 * path that lets discovery work from genre/mood alone, with zero seed
 * artists (seeds are an optional refinement, not a requirement).
 *
 * Last.fm's tag.getTopArtists is a fixed, deterministically-ranked list —
 * calling it for the same page numbers always returns the same artists in
 * the same order. Originally this always fetched pages 1..pagesPerTag
 * sequentially, which meant every "identical" search pulled from the exact
 * same ~60-80 artists every time, and everything downstream (tag filter,
 * obscurity cutoff, Deezer availability) is itself deterministic given a
 * fixed input — so results barely varied between runs no matter how
 * "random" the final sampling step was. Randomizing *which* pages we pull
 * (see pickRandomPages) is what actually fixes that: different runs now
 * draw from different slices of the tag's full catalog.
 *
 * All (tag, page) fetches run concurrently (bounded) rather than one tag
 * and page at a time, since bumping pagesPerTag/maxPageIndex for variety
 * would otherwise make this stage noticeably slower.
 */
export async function fetchTagCandidates(
  tags: string[],
  getTopArtistsForTag: GetTopArtistsForTagFn,
  limits: TagCandidateLimits = DEFAULT_TAG_CANDIDATE_LIMITS,
  rng: () => number = Math.random
): Promise<CandidateArtist[]> {
  const jobs = tags.flatMap((tag) =>
    pickRandomPages(limits.pagesPerTag, limits.maxPageIndex, rng).map((page) => ({ tag, page }))
  );

  const pages = await mapWithConcurrency(jobs, DEFAULT_CONCURRENCY, async ({ tag, page }) => {
    try {
      const names = await getTopArtistsForTag(tag, page, limits.artistsPerPage);
      return { tag, names };
    } catch {
      return { tag, names: [] as string[] }; // this page failed — the tag's other randomly-picked pages might still work
    }
  });

  const seen = new Set<string>();
  const results: CandidateArtist[] = [];

  for (const { tag, names } of pages) {
    for (const name of names) {
      if (results.length >= limits.maxCandidates) return results;
      const key = normalizeName(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      results.push({ name, source: `tag:${tag}` });
    }
  }

  return results;
}
