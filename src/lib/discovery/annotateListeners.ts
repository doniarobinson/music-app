import type { CandidateWithListeners, TaggedCandidate } from "./types";

type GetArtistInfoFn = (
  artistName: string
) => Promise<{ name: string; listeners: number } | null>;

/**
 * Attaches Last.fm's artist-level listener count to each candidate — our
 * obscurity signal now that Spotify's popularity score is gone. Candidates
 * Last.fm has no info for at all are dropped (can't judge obscurity for an
 * artist with no data).
 */
export async function annotateWithListeners(
  candidates: TaggedCandidate[],
  getArtistInfo: GetArtistInfoFn
): Promise<CandidateWithListeners[]> {
  const results: CandidateWithListeners[] = [];

  for (const candidate of candidates) {
    let info: { name: string; listeners: number } | null = null;
    try {
      info = await getArtistInfo(candidate.name);
    } catch {
      continue;
    }
    if (!info) continue;

    results.push({ ...candidate, listeners: info.listeners });
  }

  return results;
}
