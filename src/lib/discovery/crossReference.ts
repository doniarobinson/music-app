import type { CandidateArtist, ResolvedCandidateTrack } from "./types";

interface SpotifyArtistLike {
  id: string;
  name: string;
  popularity: number;
}

interface SpotifyTrackLike {
  id: string;
  name: string;
  popularity: number;
  artists: { id: string; name: string }[];
  album: { images: { url: string }[] };
  external_urls: { spotify: string };
}

type SearchArtistFn = (name: string) => Promise<SpotifyArtistLike | null>;
type SearchTracksFn = (artistName: string, limit?: number) => Promise<SpotifyTrackLike[]>;

/**
 * Resolves Last.fm candidate artists to real, playable Spotify tracks.
 * Unmatched candidates (no reasonable Spotify hit) are dropped silently —
 * acceptable per spec, this is a discovery feature, not an exhaustive index.
 */
export async function crossReferenceToSpotify(
  candidates: CandidateArtist[],
  deps: { searchArtistByName: SearchArtistFn; searchTracksByArtist: SearchTracksFn },
  tracksPerArtist = 5
): Promise<ResolvedCandidateTrack[]> {
  const results: ResolvedCandidateTrack[] = [];

  for (const candidate of candidates) {
    let artist: SpotifyArtistLike | null = null;
    try {
      artist = await deps.searchArtistByName(candidate.name);
    } catch {
      continue;
    }
    if (!artist) continue;

    let tracks: SpotifyTrackLike[] = [];
    try {
      tracks = await deps.searchTracksByArtist(artist.name, tracksPerArtist);
    } catch {
      continue;
    }

    for (const track of tracks) {
      results.push({
        spotifyTrackId: track.id,
        trackName: track.name,
        artistName: artist.name,
        spotifyArtistId: artist.id,
        popularity: track.popularity,
        albumImageUrl: track.album.images[0]?.url ?? null,
        spotifyUrl: track.external_urls.spotify,
      });
    }
  }

  return results;
}
