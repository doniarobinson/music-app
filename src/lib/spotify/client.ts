import { getSessionTokens, setSessionCookie } from "@/lib/session";
import { refreshAccessToken } from "./auth";
import type { SpotifyArtist, SpotifyPagedResult, SpotifyTrack } from "./types";

const API_BASE = "https://api.spotify.com/v1";

export class SpotifyAuthError extends Error {}

/**
 * Returns a valid access token for the current session, transparently
 * refreshing (and re-persisting the cookie) if it's expired or about to be.
 */
async function getValidAccessToken(): Promise<string> {
  const tokens = await getSessionTokens();
  if (!tokens) throw new SpotifyAuthError("No active Spotify session");

  const EXPIRY_BUFFER_MS = 60_000; // refresh a little early to avoid races
  if (Date.now() < tokens.expiresAt - EXPIRY_BUFFER_MS) {
    return tokens.accessToken;
  }

  const refreshed = await refreshAccessToken(tokens.refreshToken);
  await setSessionCookie(refreshed);
  return refreshed.accessToken;
}

async function spotifyFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const accessToken = await getValidAccessToken();
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) throw new SpotifyAuthError("Spotify access token rejected");
  if (!res.ok) {
    throw new Error(`Spotify API error ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export type TopTimeRange = "short_term" | "medium_term" | "long_term";

export async function getTopArtists(
  timeRange: TopTimeRange,
  limit = 20
): Promise<SpotifyArtist[]> {
  const data = await spotifyFetch<SpotifyPagedResult<SpotifyArtist>>("/me/top/artists", {
    time_range: timeRange,
    limit: String(limit),
  });
  return data.items;
}

export async function getTopTracks(
  timeRange: TopTimeRange,
  limit = 20
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<SpotifyPagedResult<SpotifyTrack>>("/me/top/tracks", {
    time_range: timeRange,
    limit: String(limit),
  });
  return data.items;
}

export async function getSavedTracks(limit = 50): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<SpotifyPagedResult<{ track: SpotifyTrack }>>(
    "/me/tracks",
    { limit: String(limit) }
  );
  return data.items.map((i) => i.track);
}

/** Resolves a Last.fm artist name to a real Spotify artist via search. */
export async function searchArtistByName(name: string): Promise<SpotifyArtist | null> {
  const data = await spotifyFetch<{ artists: SpotifyPagedResult<SpotifyArtist> }>(
    "/search",
    { q: name, type: "artist", limit: "5" }
  );
  return data.artists.items[0] ?? null;
}

/** Fetches a bounded number of tracks for an artist via search (top-tracks endpoint is gone for new apps). */
export async function searchTracksByArtist(
  artistName: string,
  limit = 5
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ tracks: SpotifyPagedResult<SpotifyTrack> }>(
    "/search",
    { q: `artist:"${artistName}"`, type: "track", limit: String(limit) }
  );
  return data.tracks.items;
}
