import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSimilarArtists, LastfmAuthError } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("lastfmFetch (via getSimilarArtists)", () => {
  const originalKey = process.env.LASTFM_API_KEY;

  beforeEach(() => {
    process.env.LASTFM_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env.LASTFM_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("throws LastfmAuthError when Last.fm rejects the API key", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(403, { error: 10, message: "Invalid API key" })
    );

    await expect(getSimilarArtists("Radiohead")).rejects.toBeInstanceOf(LastfmAuthError);
  });

  it("throws a plain Error (not LastfmAuthError) for unrelated failures", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(500, { error: 8, message: "Operation failed" })
    );

    const err = await getSimilarArtists("Radiohead").catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(LastfmAuthError);
  });

  it("resolves normally on a successful response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, { similarartists: { artist: [{ name: "Thom Yorke", match: "1" }] } })
    );

    const result = await getSimilarArtists("Radiohead");
    expect(result).toEqual([{ name: "Thom Yorke", match: 1 }]);
  });
});
