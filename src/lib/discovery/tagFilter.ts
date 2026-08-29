import type { CandidateArtist, TaggedCandidate } from "./types";

type GetTopTagsFn = (artistName: string) => Promise<{ name: string }[]>;

function normalizeTag(tag: string): string {
  return tag
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Fetches Last.fm tags for each candidate (in-memory cache scoped to this
 * single call — do not rely on this surviving across requests, serverless
 * instances don't persist module state between invocations) and keeps only
 * candidates whose tags intersect the user's selected genre/mood tags.
 * Empty selectedTags means "no filter" (pass everything through) rather than
 * "filter out everything" — an empty checkbox selection shouldn't zero out
 * results, and folksonomy tagging is inconsistent enough that an any-of
 * match (not requiring every selected tag) is the right default.
 */
export async function fetchAndFilterByTags(
  candidates: CandidateArtist[],
  selectedTags: string[],
  getTopTags: GetTopTagsFn
): Promise<TaggedCandidate[]> {
  if (selectedTags.length === 0) {
    return candidates.map((c) => ({ ...c, tags: [] }));
  }

  const normalizedSelected = new Set(selectedTags.map(normalizeTag));
  const tagCache = new Map<string, string[]>();
  const results: TaggedCandidate[] = [];

  for (const candidate of candidates) {
    let tags = tagCache.get(candidate.name);
    if (tags === undefined) {
      try {
        const raw = await getTopTags(candidate.name);
        tags = raw.map((t) => t.name);
      } catch {
        tags = []; // graceful degradation: treat as untagged rather than failing the batch
      }
      tagCache.set(candidate.name, tags);
    }

    const normalizedTags = tags.map(normalizeTag);
    const matches = normalizedTags.some((t) => normalizedSelected.has(t));
    if (matches) {
      results.push({ ...candidate, tags });
    }
  }

  return results;
}
