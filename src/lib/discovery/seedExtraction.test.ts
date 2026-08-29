import { describe, expect, it } from "vitest";
import { extractSeedCandidates } from "./seedExtraction";

describe("extractSeedCandidates", () => {
  it("dedupes the same artist appearing across time ranges and library", () => {
    const result = extractSeedCandidates({
      topArtistsByTimeRange: [
        [{ id: "1", name: "Radiohead" }],
        [{ id: "1", name: "Radiohead" }],
        [],
      ],
      savedTrackArtists: [{ id: "1", name: "Radiohead" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Radiohead");
  });

  it("ranks artists appearing in more sources higher", () => {
    const result = extractSeedCandidates({
      topArtistsByTimeRange: [
        [{ id: "1", name: "Radiohead" }, { id: "2", name: "Beach House" }],
        [{ id: "1", name: "Radiohead" }],
      ],
      savedTrackArtists: [],
    });
    expect(result[0].name).toBe("Radiohead");
    expect(result[1].name).toBe("Beach House");
  });

  it("dedupes by normalized name across ID-less name variants", () => {
    const result = extractSeedCandidates({
      topArtistsByTimeRange: [[{ id: "1", name: "The National" }]],
      savedTrackArtists: [{ id: "1", name: "National" }],
    });
    expect(result).toHaveLength(1);
  });

  it("returns an empty list for no input", () => {
    const result = extractSeedCandidates({ topArtistsByTimeRange: [], savedTrackArtists: [] });
    expect(result).toEqual([]);
  });
});
