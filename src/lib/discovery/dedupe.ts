import type { ResolvedCandidateTrack } from "./types";

/**
 * Removes candidates already in the user's library — the whole point is
 * surfacing what they DON'T already listen to. Matches by Spotify ID, never
 * by name, to avoid false-positive drops from same-named different artists.
 */
export function dedupeAgainstLibrary<
  T extends Pick<ResolvedCandidateTrack, "spotifyTrackId" | "spotifyArtistId">
>(
  candidates: T[],
  library: { trackIds: Set<string>; artistIds: Set<string> }
): T[] {
  return candidates.filter(
    (c) =>
      !library.trackIds.has(c.spotifyTrackId) && !library.artistIds.has(c.spotifyArtistId)
  );
}
