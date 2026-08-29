import { getEnv } from "@/lib/env";
import type { LastfmSimilarArtist, LastfmTag } from "./types";

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
