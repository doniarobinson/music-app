export interface SeedArtist {
  id: string;
  name: string;
}

export interface LibraryTrackRef {
  id: string;
  artistIds: string[];
}

export interface CandidateArtist {
  name: string;
  /** Which seed(s) this candidate was reached from, for future explainability. */
  fromSeed: string;
}

export interface TaggedCandidate extends CandidateArtist {
  tags: string[];
}

export interface ResolvedCandidateTrack {
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  spotifyArtistId: string;
  popularity: number;
  albumImageUrl: string | null;
  spotifyUrl: string;
}

export type DiscoveryResult = ResolvedCandidateTrack;

export interface DiscoveryParams {
  seedArtists: SeedArtist[];
  /** Popularity ceiling, 0-100. Lower = more obscure. */
  obscurityMax: number;
  genreTags: string[];
  moodTags: string[];
  resultCount?: number;
}

/** Dependencies injected into the pipeline so each stage is unit-testable without live APIs. */
export interface DiscoveryDeps {
  getSimilarArtists: (artistName: string, limit?: number) => Promise<{ name: string; match: number }[]>;
  getTopTags: (artistName: string) => Promise<{ name: string }[]>;
  searchArtistByName: (name: string) => Promise<{
    id: string;
    name: string;
    popularity: number;
  } | null>;
  searchTracksByArtist: (
    artistName: string,
    limit?: number
  ) => Promise<
    {
      id: string;
      name: string;
      popularity: number;
      artists: { id: string; name: string }[];
      album: { images: { url: string }[] };
      external_urls: { spotify: string };
    }[]
  >;
  rng?: () => number;
}
