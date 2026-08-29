import { mapWithConcurrency } from "@/lib/concurrency";
import type { CandidateWithListeners, TaggedCandidate } from "./types";

type GetArtistInfoFn = (
  artistName: string
) => Promise<{ name: string; listeners: number } | null>;

const DEFAULT_CONCURRENCY = 6;

/**
 * Attaches Last.fm's artist-level listener count to each candidate — our
 * obscurity signal now that Spotify's popularity score is gone. Fetched
 * concurrently (bounded) rather than one at a time. Candidates Last.fm has
 * no info for at all are dropped (can't judge obscurity for an artist with
 * no data).
 */
export async function annotateWithListeners(
  candidates: TaggedCandidate[],
  getArtistInfo: GetArtistInfoFn,
  concurrency = DEFAULT_CONCURRENCY
): Promise<CandidateWithListeners[]> {
  const infos = await mapWithConcurrency(candidates, concurrency, async (candidate) => {
    try {
      return await getArtistInfo(candidate.name);
    } catch {
      return null;
    }
  });

  const results: CandidateWithListeners[] = [];
  candidates.forEach((candidate, i) => {
    const info = infos[i];
    if (info) results.push({ ...candidate, listeners: info.listeners });
  });

  return results;
}
