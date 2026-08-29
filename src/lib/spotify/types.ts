export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  /** epoch ms when accessToken expires */
  expiresAt: number;
}

export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: SpotifyImage[];
  external_urls: { spotify: string };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  popularity: number;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: SpotifyImage[];
  };
  external_urls: { spotify: string };
}

export interface SpotifyPagedResult<T> {
  items: T[];
  total: number;
}
