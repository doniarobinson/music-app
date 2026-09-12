import { mapWithConcurrency } from "@/lib/concurrency";
import { LastfmAuthError } from "@/lib/lastfm/client";
import type { CandidateWithListeners, ResolvedCandidateTrack } from "./types";

type GetTopTracksFn = (
  artistName: string,
  limit?: number
) => Promise<{ name: string; artistName: string; url: string }[]>;

type FindPreviewFn = (
  artistName: string,
  trackName: string
) => Promise<{ previewUrl: string; albumArtUrl: string | null } | null>;

// Kept modest (rather than the 6 used elsewhere in the pipeline) since the
// iTunes Search API is keyless and rate-limited per source IP — see
// itunes/client.ts.
const DEFAULT_CONCURRENCY = 3;

/**
 * Turns surviving candidate artists into actual playable tracks: pulls each
 * artist's top tracks from Last.fm (their own endpoint, not the deprecated
 * Spotify one), then resolves each to an iTunes preview. Tracks with no
 * iTunes match are dropped — the inline 30s preview is the whole point of a
 * result card, so an unplayable one isn't worth keeping (this is a
 * discovery feature, not an exhaustive index; silent drops are acceptable).
 *
 * Artists are processed concurrently (bounded), and each artist's tracks are
 * resolved to previews in parallel too — this used to be fully sequential
 * (one top-tracks call, then one preview call at a time, artist after
 * artist), which was the main reason a full discovery run could take well
 * over a minute.
 */
export async function resolveTracksWithPreviews(
  candidates: CandidateWithListeners[],
  deps: { getTopTracksForArtist: GetTopTracksFn; findTrackPreview: FindPreviewFn },
  tracksPerArtist = 2,
  concurrency = DEFAULT_CONCURRENCY
): Promise<ResolvedCandidateTrack[]> {
  let tracksAttempted = 0;
  let previewsFound = 0;

  const perArtist = await mapWithConcurrency(candidates, concurrency, async (candidate) => {
    let tracks: { name: string; artistName: string; url: string }[] = [];
    try {
      tracks = await deps.getTopTracksForArtist(candidate.name, tracksPerArtist);
    } catch (err) {
      if (err instanceof LastfmAuthError) throw err;
      console.error(`[resolveTracksWithPreviews] skipping "${candidate.name}":`, err);
      return [] as ResolvedCandidateTrack[];
    }

    const resolved = await Promise.all(
      tracks.map(async (track): Promise<ResolvedCandidateTrack | null> => {
        tracksAttempted++;
        try {
          const preview = await deps.findTrackPreview(candidate.name, track.name);
          if (!preview) return null;
          previewsFound++;
          return {
            trackName: track.name,
            artistName: candidate.name,
            listeners: candidate.listeners,
            previewUrl: preview.previewUrl,
            albumArtUrl: preview.albumArtUrl,
            lastfmUrl: track.url,
          };
        } catch (err) {
          if (err instanceof LastfmAuthError) throw err;
          console.error(`[resolveTracksWithPreviews] skipping "${candidate.name} – ${track.name}":`, err);
          return null;
        }
      })
    );

    return resolved.filter((r): r is ResolvedCandidateTrack => r !== null);
  });

  console.log(
    `[resolveTracksWithPreviews] tracksAttempted=${tracksAttempted} previewsFound=${previewsFound}`
  );

  return perArtist.flat();
}
