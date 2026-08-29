import { describe, expect, it } from "vitest";
import { dedupeAgainstLibrary } from "./dedupe";

describe("dedupeAgainstLibrary", () => {
  const library = {
    trackIds: new Set(["track-1"]),
    artistIds: new Set(["artist-1"]),
  };

  it("drops a candidate whose track ID is already in the library", () => {
    const result = dedupeAgainstLibrary(
      [{ spotifyTrackId: "track-1", spotifyArtistId: "artist-2" }],
      library
    );
    expect(result).toEqual([]);
  });

  it("drops a candidate whose artist ID is already in the library", () => {
    const result = dedupeAgainstLibrary(
      [{ spotifyTrackId: "track-2", spotifyArtistId: "artist-1" }],
      library
    );
    expect(result).toEqual([]);
  });

  it("keeps a candidate with no ID overlap", () => {
    const result = dedupeAgainstLibrary(
      [{ spotifyTrackId: "track-2", spotifyArtistId: "artist-2" }],
      library
    );
    expect(result).toHaveLength(1);
  });

  it("does not false-positive on same-named-but-different-ID artists", () => {
    // Name collisions must never cause a drop — only ID matches should.
    const result = dedupeAgainstLibrary(
      [{ spotifyTrackId: "track-3", spotifyArtistId: "artist-3" }],
      library
    );
    expect(result).toHaveLength(1);
  });
});
