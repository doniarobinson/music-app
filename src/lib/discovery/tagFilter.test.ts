import { describe, expect, it, vi } from "vitest";
import { fetchAndFilterByTags } from "./tagFilter";

describe("fetchAndFilterByTags", () => {
  const candidates = [
    { name: "Boards of Canada", fromSeed: "Aphex Twin" },
    { name: "Some Pop Artist", fromSeed: "Aphex Twin" },
  ];

  it("passes everything through when no tags are selected", async () => {
    const getTopTags = vi.fn();
    const result = await fetchAndFilterByTags(candidates, [], getTopTags);
    expect(result).toHaveLength(2);
    expect(getTopTags).not.toHaveBeenCalled();
  });

  it("keeps only candidates whose tags intersect the selection (any-of match)", async () => {
    const getTopTags = vi.fn(async (name: string) =>
      name === "Boards of Canada"
        ? [{ name: "IDM" }, { name: "Ambient" }]
        : [{ name: "Pop" }]
    );
    const result = await fetchAndFilterByTags(candidates, ["ambient"], getTopTags);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Boards of Canada");
  });

  it("matches case-insensitively", async () => {
    const getTopTags = vi.fn(async () => [{ name: "AMBIENT" }]);
    const result = await fetchAndFilterByTags(
      [candidates[0]],
      ["ambient"],
      getTopTags
    );
    expect(result).toHaveLength(1);
  });

  it("treats a failed tag fetch as untagged rather than throwing", async () => {
    const getTopTags = vi.fn(async () => {
      throw new Error("Last.fm down");
    });
    const result = await fetchAndFilterByTags(candidates, ["ambient"], getTopTags);
    expect(result).toEqual([]);
  });

  it("caches tag lookups so no artist is fetched twice in one call", async () => {
    const getTopTags = vi.fn(async () => [{ name: "ambient" }]);
    const dup = [candidates[0], candidates[0]];
    await fetchAndFilterByTags(dup, ["ambient"], getTopTags);
    expect(getTopTags).toHaveBeenCalledTimes(1);
  });
});
