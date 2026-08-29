import type { CandidateWithListeners, ResolvedCandidateTrack } from "./types";

type GetTopTracksFn = (
  artistName: string,
  limit?: number
) => Promise<{ name: string; artistName: string; url: string }[]>;

type FindPreviewFn = (
  artistName: string,
  trackName: string
) => Promise<{ previewUrl: string; albumArtUrl: string | null; deezerUrl: string } | null>;

/**
 * Turns surviving candidate artists into actual playable tracks: pulls each
 * artist's top tracks from Last.fm (their own endpoint, not the deprecated
 * Spotify one), then resolves each to a Deezer preview. Tracks with no
 * Deezer match are dropped — the inline 30s preview is the whole point of a
 * result card, so an unplayable one isn't worth keeping (this is a
 * discovery feature, not an exhaustive index; silent drops are acceptable).
 */
export async function resolveTracksWithPreviews(
  candidates: CandidateWithListeners[],
  deps: { getTopTracksForArtist: GetTopTracksFn; findTrackPreview: FindPreviewFn },
  tracksPerArtist = 3
): Promise<ResolvedCandidateTrack[]> {
  const results: ResolvedCandidateTrack[] = [];

  for (const candidate of candidates) {
    let tracks: { name: string; artistName: string; url: string }[] = [];
    try {
      tracks = await deps.getTopTracksForArtist(candidate.name, tracksPerArtist);
    } catch {
      continue;
    }

    for (const track of tracks) {
      let preview: Awaited<ReturnType<FindPreviewFn>> = null;
      try {
        preview = await deps.findTrackPreview(candidate.name, track.name);
      } catch {
        continue;
      }
      if (!preview) continue;

      results.push({
        trackName: track.name,
        artistName: candidate.name,
        listeners: candidate.listeners,
        previewUrl: preview.previewUrl,
        albumArtUrl: preview.albumArtUrl,
        lastfmUrl: track.url,
      });
    }
  }

  return results;
}
