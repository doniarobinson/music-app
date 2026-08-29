import { mapWithConcurrency } from "@/lib/concurrency";
import type { CandidateArtist, TaggedCandidate } from "./types";

type GetTopTagsFn = (artistName: string) => Promise<{ name: string }[]>;

const DEFAULT_CONCURRENCY = 6;

function normalizeTag(tag: string): string {
  return tag
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Fetches Last.fm tags for each unique candidate (deduped and fetched
 * concurrently — do not rely on this surviving across requests, serverless
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
  getTopTags: GetTopTagsFn,
  concurrency = DEFAULT_CONCURRENCY
): Promise<TaggedCandidate[]> {
  if (selectedTags.length === 0) {
    return candidates.map((c) => ({ ...c, tags: [] }));
  }

  const normalizedSelected = new Set(selectedTags.map(normalizeTag));
  const uniqueNames = Array.from(new Set(candidates.map((c) => c.name)));
  const tagsByName = new Map<string, string[]>();

  await mapWithConcurrency(uniqueNames, concurrency, async (name) => {
    try {
      const raw = await getTopTags(name);
      tagsByName.set(name, raw.map((t) => t.name));
    } catch {
      tagsByName.set(name, []); // graceful degradation: treat as untagged rather than failing the batch
    }
  });

  const results: TaggedCandidate[] = [];
  for (const candidate of candidates) {
    const tags = tagsByName.get(candidate.name) ?? [];
    const normalizedTags = tags.map(normalizeTag);
    if (normalizedTags.some((t) => normalizedSelected.has(t))) {
      results.push({ ...candidate, tags });
    }
  }

  return results;
}
