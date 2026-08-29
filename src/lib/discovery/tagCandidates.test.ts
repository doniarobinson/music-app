import { describe, expect, it, vi } from "vitest";
import { fetchTagCandidates } from "./tagCandidates";

function seededRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

describe("fetchTagCandidates", () => {
  it("always fetches page 1 as a reliability floor", async () => {
    const getTopArtistsForTag = vi.fn(async (_tag: string, page: number) =>
      page === 1 ? ["Artist A", "Artist B"] : []
    );
    const result = await fetchTagCandidates(
      ["indie rock"],
      getTopArtistsForTag,
      { pagesPerTag: 3, artistsPerPage: 20, maxCandidates: 80, maxPageIndex: 15 },
      seededRng(1)
    );
    expect(getTopArtistsForTag.mock.calls.some(([, page]) => page === 1)).toBe(true);
    expect(result.map((c) => c.name)).toEqual(["Artist A", "Artist B"]);
  });

  it("dedupes artists appearing across multiple picked pages", async () => {
    const getTopArtistsForTag = vi.fn(async () => ["Same Artist"]);
    const result = await fetchTagCandidates(
      ["indie rock"],
      getTopArtistsForTag,
      { pagesPerTag: 3, artistsPerPage: 20, maxCandidates: 80, maxPageIndex: 15 },
      seededRng(1)
    );
    expect(result).toHaveLength(1);
  });

  it("degrades gracefully when a randomly-picked page fails or is past the end of the chart", async () => {
    const getTopArtistsForTag = vi.fn(async (_tag: string, page: number) => {
      if (page === 1) return ["Artist A"];
      if (page > 5) throw new Error("out of range");
      return [];
    });
    const result = await fetchTagCandidates(
      ["obscure-tag"],
      getTopArtistsForTag,
      { pagesPerTag: 3, artistsPerPage: 20, maxCandidates: 80, maxPageIndex: 15 },
      seededRng(1)
    );
    // Page 1's result should always survive even if the other randomly
    // picked pages come back empty or throw.
    expect(result.map((c) => c.name)).toContain("Artist A");
  });

  it("respects the maxCandidates cap across tags", async () => {
    const getTopArtistsForTag = vi.fn(async (tag: string, page: number) =>
      Array.from({ length: 20 }, (_, i) => `${tag}-p${page}-${i}`)
    );
    const result = await fetchTagCandidates(
      ["a", "b"],
      getTopArtistsForTag,
      { pagesPerTag: 3, artistsPerPage: 20, maxCandidates: 50, maxPageIndex: 15 },
      seededRng(1)
    );
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("picks different pages across separate calls, not the same fixed set every time", async () => {
    const requestedPages: number[] = [];
    const getTopArtistsForTag = vi.fn(async (_tag: string, page: number) => {
      requestedPages.push(page);
      return [`artist-page-${page}`];
    });

    let seed = 1;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    await fetchTagCandidates(
      ["indie rock"],
      getTopArtistsForTag,
      { pagesPerTag: 3, artistsPerPage: 20, maxCandidates: 80, maxPageIndex: 15 },
      rng
    );
    const firstRunPages = [...requestedPages];
    requestedPages.length = 0;

    await fetchTagCandidates(
      ["indie rock"],
      getTopArtistsForTag,
      { pagesPerTag: 3, artistsPerPage: 20, maxCandidates: 80, maxPageIndex: 15 },
      rng // rng state has advanced, so this run should draw different pages
    );
    const secondRunPages = [...requestedPages];

    // Sorted, since fetches now run concurrently — completion order isn't
    // meaningful, only which set of pages got picked.
    expect([...firstRunPages].sort()).not.toEqual([...secondRunPages].sort());
  });
});
