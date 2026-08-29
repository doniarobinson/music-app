import { describe, expect, it } from "vitest";
import { filterByObscurity, sliderToListenerCeiling } from "./obscurityFilter";

describe("sliderToListenerCeiling", () => {
  it("is monotonically increasing", () => {
    const ceilings = [0, 25, 50, 75, 100].map(sliderToListenerCeiling);
    for (let i = 1; i < ceilings.length; i++) {
      expect(ceilings[i]).toBeGreaterThan(ceilings[i - 1]);
    }
  });

  it("clamps out-of-range input", () => {
    expect(sliderToListenerCeiling(-10)).toBe(sliderToListenerCeiling(0));
    expect(sliderToListenerCeiling(200)).toBe(sliderToListenerCeiling(100));
  });
});

describe("filterByObscurity", () => {
  const candidates = [
    { listeners: 50 },
    { listeners: 10_000 },
    { listeners: 10_000_000 },
  ];

  it("keeps only candidates at or below the slider's listener ceiling", () => {
    const result = filterByObscurity(candidates, 0);
    expect(result.map((c) => c.listeners)).toEqual([50]);
  });

  it("passes everything through at slider 100", () => {
    expect(filterByObscurity(candidates, 100)).toHaveLength(3);
  });

  it("includes the boundary value (inclusive)", () => {
    const ceiling = sliderToListenerCeiling(50);
    const result = filterByObscurity([{ listeners: ceiling }], 50);
    expect(result).toHaveLength(1);
  });
});
