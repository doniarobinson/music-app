import { getEnv } from "@/lib/env";
import type {
  LastfmArtistInfo,
  LastfmArtistSearchResult,
  LastfmSimilarArtist,
  LastfmTag,
  LastfmTrack,
} from "./types";

const API_BASE = "https://ws.audioscrobbler.com/2.0/";

async function lastfmFetch<T>(method: string, params: Record<string, string>): Promise<T> {
  const env = getEnv();
  const url = new URL(API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", env.LASTFM_API_KEY);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url);
  if (res.status === 429) {
    const err = new Error("Last.fm rate limit hit");
    err.name = "LastfmRateLimitError";
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Last.fm API error ${res.status} on ${method}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

interface SimilarArtistsResponse {
  similarartists?: { artist: { name: string; match: string }[] };
}

export async function getSimilarArtists(
  artistName: string,
  limit = 10
): Promise<LastfmSimilarArtist[]> {
  const data = await lastfmFetch<SimilarArtistsResponse>("artist.getSimilar", {
    artist: artistName,
    limit: String(limit),
    autocorrect: "1",
  });
  return (data.similarartists?.artist ?? []).map((a) => ({
    name: a.name,
    match: Number(a.match),
  }));
}

interface TopTagsResponse {
  toptags?: { tag: { name: string }[] };
}

export async function getTopTags(artistName: string): Promise<LastfmTag[]> {
  const data = await lastfmFetch<TopTagsResponse>("artist.getTopTags", {
    artist: artistName,
    autocorrect: "1",
  });
  return data.toptags?.tag ?? [];
}

interface ArtistSearchResponse {
  results?: { artistmatches?: { artist: { name: string; listeners: string }[] } };
}

/** Live type-ahead search for the artist seed picker. */
export async function searchArtists(
  query: string,
  limit = 8
): Promise<LastfmArtistSearchResult[]> {
  if (!query.trim()) return [];
  const data = await lastfmFetch<ArtistSearchResponse>("artist.search", {
    artist: query,
    limit: String(limit),
  });
  const matches = data.results?.artistmatches?.artist ?? [];
  return matches.map((a) => ({ name: a.name, listeners: Number(a.listeners) }));
}

interface ArtistInfoResponse {
  artist?: { name: string; stats?: { listeners: string; playcount: string }; url: string };
}

/** Artist-level listener count — used as our obscurity signal (no Spotify popularity anymore). */
export async function getArtistInfo(artistName: string): Promise<LastfmArtistInfo | null> {
  const data = await lastfmFetch<ArtistInfoResponse>("artist.getInfo", {
    artist: artistName,
    autocorrect: "1",
  });
  if (!data.artist) return null;
  return {
    name: data.artist.name,
    listeners: Number(data.artist.stats?.listeners ?? 0),
    playcount: Number(data.artist.stats?.playcount ?? 0),
    url: data.artist.url,
  };
}

interface TopTracksResponse {
  toptracks?: { track: { name: string; playcount: string; url: string }[] };
}

/** Last.fm's own top-tracks-for-artist — unlike Spotify's, this one isn't deprecated. */
export async function getTopTracksForArtist(
  artistName: string,
  limit = 5
): Promise<LastfmTrack[]> {
  const data = await lastfmFetch<TopTracksResponse>("artist.getTopTracks", {
    artist: artistName,
    limit: String(limit),
    autocorrect: "1",
  });
  return (data.toptracks?.track ?? []).map((t) => ({
    name: t.name,
    artistName,
    playcount: Number(t.playcount),
    url: t.url,
  }));
}

interface TagTopArtistsResponse {
  topartists?: { artist: { name: string }[] };
}

/**
 * Artists for a given genre/mood tag, paged. Later pages skew toward
 * less-mainstream artists within the tag, which we lean on for obscurity —
 * see tagCandidates.ts.
 */
export async function getTopArtistsForTag(
  tag: string,
  page: number,
  limit = 30
): Promise<string[]> {
  const data = await lastfmFetch<TagTopArtistsResponse>("tag.getTopArtists", {
    tag,
    page: String(page),
    limit: String(limit),
  });
  return (data.topartists?.artist ?? []).map((a) => a.name);
}
