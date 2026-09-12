import { describe, expect, it, vi } from "vitest";
import { runDiscoveryPipeline } from "./pipeline";

const POOL_SIZE = 20;

/** A pool of fake artists reachable via a single genre tag, all equally "obscure" (same listener count). */
function makeDeps(opts: { successfulArtistIndices: Set<number> }) {
  const getTopArtistsForTag = vi.fn(async (_tag: string, _page: number, limit = 20) =>
    Array.from({ length: limit }, (_, i) => `Artist ${i}`)
  );
  const getTopTags = vi.fn(async () => [{ name: "test-genre" }]);
  const getArtistInfo = vi.fn(async (name: string) => ({ name, listeners: 1000 }));
  const getTopTracksForArtist = vi.fn(async (artistName: string, limit = 2) =>
    Array.from({ length: limit }, (_, i) => ({
      name: `${artistName} Track ${i}`,
      artistName,
      url: `https://last.fm/${artistName}/${i}`,
    }))
  );
  const findTrackPreview = vi.fn(async (artistName: string) => {
    const index = Number(artistName.replace("Artist ", ""));
    if (!opts.successfulArtistIndices.has(index)) return null;
    return { previewUrl: `https://itunes.example/${artistName}.m4a`, albumArtUrl: null };
  });
  const getSimilarArtists = vi.fn(async () => []);

  return {
    getSimilarArtists,
    getTopTags,
    getTopArtistsForTag,
    getArtistInfo,
    getTopTracksForArtist,
    findTrackPreview,
  };
}

const baseParams = {
  seedArtists: [],
  genreTags: ["test-genre"],
  moodTags: [],
  obscuritySlider: 100, // keep the whole pool through the obscurity filter
};

describe("runDiscoveryPipeline preview resolution", () => {
  it("defaults to 10 results when enough previews are found across the pool", async () => {
    const evenIndices = new Set(Array.from({ length: POOL_SIZE }, (_, i) => i).filter((i) => i % 2 === 0));
    const deps = makeDeps({ successfulArtistIndices: evenIndices });

    const results = await runDiscoveryPipeline(baseParams, deps);

    expect(results).toHaveLength(10);
  });

  it("respects an explicit resultCount", async () => {
    const evenIndices = new Set(Array.from({ length: POOL_SIZE }, (_, i) => i).filter((i) => i % 2 === 0));
    const deps = makeDeps({ successfulArtistIndices: evenIndices });

    const results = await runDiscoveryPipeline({ ...baseParams, resultCount: 3 }, deps);

    expect(results).toHaveLength(3);
  });

  it("backfills from the rest of the pool instead of stopping after the first batch", async () => {
    // Only 2 artists in the whole 20-artist pool ever resolve a preview —
    // nowhere near enough from a single ~15-artist batch, so this only
    // succeeds if every unresolved candidate eventually gets tried.
    const deps = makeDeps({ successfulArtistIndices: new Set([3, 17]) });

    const results = await runDiscoveryPipeline(baseParams, deps);

    // Only 2 distinct artists ever resolve a preview, and the final sample
    // keeps at most 1 track per artist — so 2 is the ceiling here, short of
    // the requested 10, degrading gracefully instead of crashing or looping.
    expect(results).toHaveLength(2);
    // Every candidate's 2 tracks (TRACKS_PER_ARTIST) were tried for a
    // preview, proving the whole pool was exhausted rather than giving up
    // after the first ~15-artist batch.
    expect(deps.findTrackPreview.mock.calls.length).toBe(POOL_SIZE * 2);
  });

  it("never includes two tracks from the same artist in the final results", async () => {
    const evenIndices = new Set(Array.from({ length: POOL_SIZE }, (_, i) => i).filter((i) => i % 2 === 0));
    const deps = makeDeps({ successfulArtistIndices: evenIndices });

    const results = await runDiscoveryPipeline(baseParams, deps);

    const artistNames = results.map((r) => r.artistName);
    expect(new Set(artistNames).size).toBe(artistNames.length);
  });
});
