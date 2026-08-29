export interface SeedArtist {
  name: string;
}

export interface CandidateArtist {
  name: string;
  /** Which seed/tag this candidate was reached from, for future explainability. */
  source: string;
}

export interface TaggedCandidate extends CandidateArtist {
  tags: string[];
}

export interface CandidateWithListeners extends TaggedCandidate {
  listeners: number;
}

export interface ResolvedCandidateTrack {
  trackName: string;
  artistName: string;
  /** Artist-level Last.fm listener count — our obscurity signal (no Spotify popularity anymore). */
  listeners: number;
  previewUrl: string;
  albumArtUrl: string | null;
  lastfmUrl: string;
}

export type DiscoveryResult = ResolvedCandidateTrack;

export interface DiscoveryParams {
  seedArtists: SeedArtist[];
  genreTags: string[];
  moodTags: string[];
  /** 0-100 UI slider value; mapped internally to a listener-count ceiling on a log scale. */
  obscuritySlider: number;
  resultCount?: number;
}

/** Dependencies injected into the pipeline so each stage is unit-testable without live APIs. */
export interface DiscoveryDeps {
  getSimilarArtists: (artistName: string, limit?: number) => Promise<{ name: string }[]>;
  getTopTags: (artistName: string) => Promise<{ name: string }[]>;
  getTopArtistsForTag: (tag: string, page: number, limit?: number) => Promise<string[]>;
  getArtistInfo: (
    artistName: string
  ) => Promise<{ name: string; listeners: number } | null>;
  getTopTracksForArtist: (
    artistName: string,
    limit?: number
  ) => Promise<{ name: string; artistName: string; url: string }[]>;
  findTrackPreview: (
    artistName: string,
    trackName: string
  ) => Promise<{ previewUrl: string; albumArtUrl: string | null; deezerUrl: string } | null>;
  rng?: () => number;
}
