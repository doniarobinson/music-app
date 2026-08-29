import { describe, expect, it, vi } from "vitest";
import { walkSimilarityGraph } from "./similarityGraph";

describe("walkSimilarityGraph", () => {
  const seeds = [{ id: "1", name: "Aphex Twin" }];

  it("respects the breadth cap per node after sampling down from a wider fetch", async () => {
    const getSimilar = vi.fn(async () =>
      Array.from({ length: 50 }, (_, i) => ({ name: `Artist ${i}` }))
    );
    const result = await walkSimilarityGraph(seeds, getSimilar, {
      depth: 1,
      similarPerNode: 5,
      maxCandidates: 1000,
    });
    // Fetches a wider pool than similarPerNode (see FETCH_MULTIPLIER) so
    // there's something to randomly sample from, then trims to the cap.
    expect(getSimilar).toHaveBeenCalledWith("Aphex Twin", 15);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("samples a different subset across calls instead of always the deterministic top-N", async () => {
    const getSimilar = vi.fn(async () =>
      Array.from({ length: 50 }, (_, i) => ({ name: `Artist ${i}` }))
    );
    let seed = 1;
    const rng = () => {
      // simple deterministic-but-varying sequence, distinct per call site
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const runOnce = () =>
      walkSimilarityGraph(
        seeds,
        getSimilar,
        { depth: 1, similarPerNode: 5, maxCandidates: 1000 },
        rng
      );

    const first = (await runOnce()).map((c) => c.name).sort();
    const second = (await runOnce()).map((c) => c.name).sort();
    expect(first).not.toEqual(second);
  });

  it("respects the hard maxCandidates cap even with a large graph", async () => {
    let counter = 0;
    const getSimilar = vi.fn(async () =>
      Array.from({ length: 20 }, () => ({ name: `Artist ${counter++}` }))
    );
    const result = await walkSimilarityGraph(seeds, getSimilar, {
      depth: 2,
      similarPerNode: 20,
      maxCandidates: 30,
    });
    expect(result.length).toBeLessThanOrEqual(30);
  });

  it("does not include the seed artists themselves as candidates", async () => {
    const getSimilar = vi.fn(async () => [{ name: "Aphex Twin" }, { name: "Boards of Canada" }]);
    const result = await walkSimilarityGraph(seeds, getSimilar, {
      depth: 1,
      similarPerNode: 10,
      maxCandidates: 100,
    });
    expect(result.map((r) => r.name)).not.toContain("Aphex Twin");
    expect(result.map((r) => r.name)).toContain("Boards of Canada");
  });

  it("degrades gracefully when a node's lookup fails", async () => {
    const getSimilar = vi.fn(async () => {
      throw new Error("Last.fm down");
    });
    const result = await walkSimilarityGraph(seeds, getSimilar, {
      depth: 1,
      similarPerNode: 10,
      maxCandidates: 100,
    });
    expect(result).toEqual([]);
  });

  it("dedupes candidates reachable via multiple paths", async () => {
    const seeds2 = [
      { id: "1", name: "Artist A" },
      { id: "2", name: "Artist B" },
    ];
    const getSimilar = vi.fn(async () => [{ name: "Shared Artist" }]);
    const result = await walkSimilarityGraph(seeds2, getSimilar, {
      depth: 1,
      similarPerNode: 10,
      maxCandidates: 100,
    });
    expect(result.filter((r) => r.name === "Shared Artist")).toHaveLength(1);
  });
});
