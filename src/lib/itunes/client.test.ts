import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findTrackPreview } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("findTrackPreview", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a preview URL and upsized artwork on a match", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        results: [
          {
            previewUrl: "https://example.com/preview.m4a",
            artworkUrl100: "https://example.com/100x100bb.jpg",
          },
        ],
      })
    );

    const result = await findTrackPreview("Radiohead", "Creep");
    expect(result).toEqual({
      previewUrl: "https://example.com/preview.m4a",
      albumArtUrl: "https://example.com/600x600bb.jpg",
    });
  });

  it("returns null when there's no match", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { results: [] }));
    expect(await findTrackPreview("Some Artist", "Some Track")).toBeNull();
  });

  it("returns null when a result has no previewUrl", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { results: [{ artistName: "X" }] }));
    expect(await findTrackPreview("Some Artist", "Some Track")).toBeNull();
  });

  it("throws on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("rate limited", { status: 403 }));
    await expect(findTrackPreview("Some Artist", "Some Track")).rejects.toThrow(
      /iTunes Search API error 403/
    );
  });
});
