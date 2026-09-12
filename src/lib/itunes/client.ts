const API_BASE = "https://itunes.apple.com/search";

export interface ItunesTrackMatch {
  previewUrl: string;
  albumArtUrl: string | null;
}

/**
 * Apple's iTunes Search API is public and keyless — like Deezer's, no
 * account/app registration needed — and returns a 30-second preview clip
 * URL directly. Rate-limited per source IP (Apple's own guidance puts it
 * around 20 requests/minute), so callers should keep concurrency and total
 * call volume low rather than resolving every candidate up front — see the
 * resolution batching in pipeline.ts.
 */
export async function findTrackPreview(
  artistName: string,
  trackName: string
): Promise<ItunesTrackMatch | null> {
  const url = new URL(API_BASE);
  url.searchParams.set("term", `${artistName} ${trackName}`);
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "1");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`iTunes Search API error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    results?: { previewUrl?: string; artworkUrl100?: string }[];
  };
  const match = data.results?.[0];
  if (!match || !match.previewUrl) return null;

  return {
    previewUrl: match.previewUrl,
    // Apple's default artwork is a small 100x100 thumbnail; this URL pattern
    // (documented nowhere official, but stable/widely relied on) swaps in a
    // larger size without an extra request.
    albumArtUrl: match.artworkUrl100?.replace("100x100", "600x600") ?? null,
  };
}
