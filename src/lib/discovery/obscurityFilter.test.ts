import { describe, expect, it } from "vitest";
import { filterByObscurity } from "./obscurityFilter";

describe("filterByObscurity", () => {
  const tracks = [{ popularity: 0 }, { popularity: 40 }, { popularity: 100 }];

  it("keeps tracks at or below the ceiling, drops those above", () => {
    expect(filterByObscurity(tracks, 40).map((t) => t.popularity)).toEqual([0, 40]);
  });

  it("includes the boundary value (inclusive)", () => {
    expect(filterByObscurity(tracks, 0).map((t) => t.popularity)).toEqual([0]);
  });

  it("passes everything through at ceiling 100", () => {
    expect(filterByObscurity(tracks, 100)).toHaveLength(3);
  });

  it("drops everything at ceiling below the minimum popularity", () => {
    expect(filterByObscurity([{ popularity: 1 }], 0)).toEqual([]);
  });
});
