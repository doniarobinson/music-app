import type { ResolvedCandidateTrack } from "./types";

/**
 * Drops tracks more popular than the user's obscurity ceiling. Spotify
 * popularity is 0-100; boundary is inclusive (popularity === max passes).
 */
export function filterByObscurity<T extends Pick<ResolvedCandidateTrack, "popularity">>(
  tracks: T[],
  obscurityMax: number
): T[] {
  return tracks.filter((t) => t.popularity <= obscurityMax);
}
