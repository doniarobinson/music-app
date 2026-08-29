import { describe, expect, it } from "vitest";
import { sampleWeightedByObscurity } from "./sampler";

function seededRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function makeTrack(id: number, listeners: number, artistName = `Artist ${id}`) {
  return {
    trackName: `Track ${id}`,
    artistName,
    listeners,
    previewUrl: `https://example.com/${id}.mp3`,
    albumArtUrl: null,
    lastfmUrl: `https://last.fm/${id}`,
  };
}

describe("sampleWeightedByObscurity", () => {
  it("returns all candidates if fewer than the requested count", () => {
    const candidates = [makeTrack(1, 10), makeTrack(2, 20)];
    expect(sampleWeightedByObscurity(candidates, 5)).toHaveLength(2);
  });

  it("returns exactly the requested count when there are enough candidates", () => {
    const candidates = Array.from({ length: 50 }, (_, i) => makeTrack(i, i * 100));
    const result = sampleWeightedByObscurity(candidates, 10, seededRng(42));
    expect(result).toHaveLength(10);
  });

  it("never picks the same track twice", () => {
    const candidates = Array.from({ length: 50 }, (_, i) => makeTrack(i, i * 100));
    const result = sampleWeightedByObscurity(candidates, 20, seededRng(7));
    const names = result.map((r) => r.trackName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("is deterministic given the same injected rng", () => {
    const candidates = Array.from({ length: 30 }, (_, i) => makeTrack(i, i * 100));
    const a = sampleWeightedByObscurity(candidates, 10, seededRng(99));
    const b = sampleWeightedByObscurity(candidates, 10, seededRng(99));
    expect(a.map((x) => x.trackName)).toEqual(b.map((x) => x.trackName));
  });

  it("biases toward lower listener counts across many trials", () => {
    const candidates = Array.from({ length: 100 }, (_, i) => makeTrack(i, (i + 1) * 1000));
    let totalAvg = 0;
    const trials = 200;
    for (let t = 0; t < trials; t++) {
      const sample = sampleWeightedByObscurity(candidates, 10, seededRng(t + 1));
      totalAvg += sample.reduce((s, c) => s + c.listeners, 0) / sample.length;
    }
    const avgListenersOfSamples = totalAvg / trials;
    // Uniform random sampling would average ~50,500 (midpoint of 1,000-100,000).
    // A listener-inverse weighting should pull this meaningfully lower.
    expect(avgListenersOfSamples).toBeLessThan(40_000);
  });

  it("caps how many tracks from the same artist can appear", () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeTrack(i, i * 10, "Same Artist")
    );
    const result = sampleWeightedByObscurity(candidates, 10, seededRng(1), 2);
    expect(result).toHaveLength(2);
  });

  it("respects the diversity cap while still filling from other artists", () => {
    const sameArtist = Array.from({ length: 5 }, (_, i) => makeTrack(i, i * 10, "Same Artist"));
    const others = Array.from({ length: 5 }, (_, i) => makeTrack(100 + i, i * 10));
    const result = sampleWeightedByObscurity([...sameArtist, ...others], 6, seededRng(1), 2);
    expect(result).toHaveLength(6);
    const sameArtistCount = result.filter((r) => r.artistName === "Same Artist").length;
    expect(sameArtistCount).toBeLessThanOrEqual(2);
  });
});
