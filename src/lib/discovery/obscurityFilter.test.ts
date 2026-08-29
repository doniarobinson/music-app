import { describe, expect, it } from "vitest";
import { filterByObscurity } from "./obscurityFilter";

describe("filterByObscurity", () => {
  it("keeps everyone at slider 100 regardless of the pool's absolute listener counts", () => {
    // Every candidate here is far more popular than any absolute floor a
    // previous fixed-threshold design might have used — the point of the
    // percentile approach is that this no longer matters.
    const candidates = Array.from({ length: 20 }, (_, i) => ({ listeners: 1_000_000 + i }));
    expect(filterByObscurity(candidates, 100)).toHaveLength(20);
  });

  it("never returns zero results for a non-empty pool, even at slider 0", () => {
    // This is the actual bug this rewrite fixes: an absolute threshold
    // could be stricter than every candidate a real query returns (a
    // genre/mood pool's least-popular artist can still have thousands of
    // listeners), silently zeroing out results regardless of the slider.
    const candidates = Array.from({ length: 50 }, (_, i) => ({ listeners: 4_000 + i * 1000 }));
    expect(filterByObscurity(candidates, 0).length).toBeGreaterThan(0);
  });

  it("keeps roughly the bottom slider% of the pool by listener count", () => {
    const candidates = Array.from({ length: 100 }, (_, i) => ({ listeners: i }));
    const result = filterByObscurity(candidates, 30);
    expect(result).toHaveLength(30);
    expect(Math.max(...result.map((c) => c.listeners))).toBeLessThan(30);
  });

  it("returns the least-popular candidates, not an arbitrary subset", () => {
    const candidates = Array.from({ length: 20 }, (_, i) => ({ listeners: i }));
    const result = filterByObscurity(candidates, 50);
    expect(result.map((c) => c.listeners).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 10 }, (_, i) => i)
    );
  });

  it("keeps at least a handful of candidates even when the slider% alone would round down to fewer", () => {
    const candidates = Array.from({ length: 50 }, (_, i) => ({ listeners: i }));
    // 5% of 50 is 2.5 (rounds to 3) — the minimum-kept floor should win out.
    expect(filterByObscurity(candidates, 5).length).toBeGreaterThanOrEqual(8);
  });

  it("returns an empty array for an empty pool", () => {
    expect(filterByObscurity([], 50)).toEqual([]);
  });

  it("never keeps more candidates than the pool actually has", () => {
    const candidates = [{ listeners: 10 }, { listeners: 20 }, { listeners: 30 }];
    expect(filterByObscurity(candidates, 0).length).toBeLessThanOrEqual(3);
    expect(filterByObscurity(candidates, 100)).toHaveLength(3);
  });
});
