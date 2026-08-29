import { describe, expect, it } from "vitest";
import { sampleWeightedByObscurity } from "./sampler";

function seededRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe("sampleWeightedByObscurity", () => {
  it("returns all candidates if fewer than the requested count", () => {
    const candidates = [{ popularity: 10 }, { popularity: 20 }];
    expect(sampleWeightedByObscurity(candidates, 5)).toHaveLength(2);
  });

  it("returns exactly the requested count when there are enough candidates", () => {
    const candidates = Array.from({ length: 50 }, (_, i) => ({ popularity: i }));
    const result = sampleWeightedByObscurity(candidates, 10, seededRng(42));
    expect(result).toHaveLength(10);
  });

  it("never picks the same item twice", () => {
    const candidates = Array.from({ length: 50 }, (_, i) => ({ popularity: i, id: i }));
    const result = sampleWeightedByObscurity(candidates, 20, seededRng(7));
    const ids = result.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is deterministic given the same injected rng", () => {
    const candidates = Array.from({ length: 30 }, (_, i) => ({ popularity: i, id: i }));
    const a = sampleWeightedByObscurity(candidates, 10, seededRng(99));
    const b = sampleWeightedByObscurity(candidates, 10, seededRng(99));
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
  });

  it("biases toward lower popularity across many trials", () => {
    const candidates = Array.from({ length: 100 }, (_, i) => ({ popularity: i, id: i }));
    let totalPopularitySum = 0;
    let trials = 0;
    let seed = 1;
    for (let t = 0; t < 200; t++) {
      seed += 1;
      const sample = sampleWeightedByObscurity(candidates, 10, seededRng(seed));
      totalPopularitySum += sample.reduce((s, c) => s + c.popularity, 0) / sample.length;
      trials++;
    }
    const avgPopularityOfSamples = totalPopularitySum / trials;
    // Uniform random sampling would average ~49.5 (midpoint of 0-99).
    // A popularity-inverse weighting should pull this meaningfully lower.
    expect(avgPopularityOfSamples).toBeLessThan(40);
  });
});
