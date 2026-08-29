import { normalizeName } from "@/lib/nameNormalize";
import type { CandidateArtist } from "./types";

type GetTopArtistsForTagFn = (tag: string, page: number, limit?: number) => Promise<string[]>;

export interface TagCandidateLimits {
  /** How many result pages to pull per tag. Later pages skew less mainstream. */
  pagesPerTag: number;
  artistsPerPage: number;
  maxCandidates: number;
}

export const DEFAULT_TAG_CANDIDATE_LIMITS: TagCandidateLimits = {
  pagesPerTag: 4,
  artistsPerPage: 30,
  maxCandidates: 200,
};

/**
 * Pulls candidate artists directly from Last.fm's tag charts — this is the
 * path that lets discovery work from genre/mood alone, with zero seed
 * artists (seeds are an optional refinement, not a requirement). Last.fm
 * ranks tag.getTopArtists by popularity within the tag, so we deliberately
 * pull several pages deep rather than just page 1 — later pages surface the
 * tag's less-mainstream artists, which is exactly the pool the obscurity
 * filter needs to have something to work with.
 */
export async function fetchTagCandidates(
  tags: string[],
  getTopArtistsForTag: GetTopArtistsForTagFn,
  limits: TagCandidateLimits = DEFAULT_TAG_CANDIDATE_LIMITS
): Promise<CandidateArtist[]> {
  const seen = new Set<string>();
  const results: CandidateArtist[] = [];

  for (const tag of tags) {
    for (let page = 1; page <= limits.pagesPerTag; page++) {
      if (results.length >= limits.maxCandidates) break;

      let names: string[] = [];
      try {
        names = await getTopArtistsForTag(tag, page, limits.artistsPerPage);
      } catch {
        break; // graceful degradation: stop paging this tag, keep the others
      }
      if (names.length === 0) break; // ran out of pages for this tag

      for (const name of names) {
        const key = normalizeName(name);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        results.push({ name, source: `tag:${tag}` });
        if (results.length >= limits.maxCandidates) break;
      }
    }
  }

  return results;
}
