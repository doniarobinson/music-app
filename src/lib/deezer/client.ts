const API_BASE = "https://api.deezer.com";

export interface DeezerTrackMatch {
  previewUrl: string;
  albumArtUrl: string | null;
  deezerUrl: string;
}

/**
 * Deezer's search API is public and keyless — no account/app registration
 * needed, unlike Spotify. It returns a 30-second `preview` mp3 URL directly,
 * which is what makes the inline-preview player possible without any auth.
 * Note: Deezer doesn't send CORS headers for browser calls, so this must be
 * called server-side (which we're doing anyway, from /api/discover).
 */
export async function findTrackPreview(
  artistName: string,
  trackName: string
): Promise<DeezerTrackMatch | null> {
  const url = new URL(`${API_BASE}/search/track`);
  url.searchParams.set("q", `artist:"${artistName}" track:"${trackName}"`);
  url.searchParams.set("limit", "1");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Deezer API error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    data?: { preview: string; link: string; album?: { cover_medium?: string } }[];
  };
  const match = data.data?.[0];
  if (!match || !match.preview) return null;

  return {
    previewUrl: match.preview,
    albumArtUrl: match.album?.cover_medium ?? null,
    deezerUrl: match.link,
  };
}
