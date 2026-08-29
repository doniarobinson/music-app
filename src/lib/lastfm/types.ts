export interface LastfmSimilarArtist {
  name: string;
  match: number; // 0-1 similarity score
}

export interface LastfmTag {
  name: string;
}

export interface LastfmArtistSearchResult {
  name: string;
  listeners: number;
}

export interface LastfmArtistInfo {
  name: string;
  listeners: number;
  playcount: number;
  url: string;
}

export interface LastfmTrack {
  name: string;
  artistName: string;
  playcount: number;
  url: string;
}
