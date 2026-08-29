import { describe, expect, it } from "vitest";
import { normalizeName, namesMatch } from "./nameNormalize";

describe("normalizeName", () => {
  it("lowercases and trims", () => {
    expect(normalizeName("  Radiohead  ")).toBe("radiohead");
  });

  it("strips a leading 'the'", () => {
    expect(normalizeName("The Beatles")).toBe("beatles");
    expect(normalizeName("the national")).toBe("national");
  });

  it("strips diacritics", () => {
    expect(normalizeName("Sigur Rós")).toBe("sigur ros");
    expect(normalizeName("Björk")).toBe("bjork");
  });

  it("strips punctuation", () => {
    expect(normalizeName("Panic! At The Disco")).toBe("panic at the disco");
  });

  it("collapses whitespace", () => {
    expect(normalizeName("Tyler,   The   Creator")).toBe("tyler the creator");
  });
});

describe("namesMatch", () => {
  it("matches names that normalize the same", () => {
    expect(namesMatch("Sigur Rós", "sigur ros")).toBe(true);
    expect(namesMatch("The Beatles", "Beatles")).toBe(true);
  });

  it("does not match genuinely different names", () => {
    expect(namesMatch("The National", "The Nationals")).toBe(false);
  });
});
