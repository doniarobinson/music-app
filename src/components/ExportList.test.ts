import { describe, expect, it } from "vitest";
import { formatResultsAsText } from "./ExportList";
import type { DiscoveryResult } from "@/lib/discovery/types";

function makeResult(artistName: string, trackName: string): DiscoveryResult {
  return {
    artistName,
    trackName,
    listeners: 100,
    previewUrl: "https://example.com/preview.mp3",
    albumArtUrl: null,
    lastfmUrl: "https://last.fm/track",
  };
}

describe("formatResultsAsText", () => {
  it("formats each result as 'Artist - Song title'", () => {
    const text = formatResultsAsText([makeResult("Radiohead", "Creep")]);
    expect(text).toBe("Radiohead - Creep");
  });

  it("joins multiple results with newlines, no numbering", () => {
    const text = formatResultsAsText([
      makeResult("Radiohead", "Creep"),
      makeResult("Pavement", "Cut Your Hair"),
    ]);
    expect(text).toBe("Radiohead - Creep\nPavement - Cut Your Hair");
  });

  it("returns an empty string for no results", () => {
    expect(formatResultsAsText([])).toBe("");
  });
});
