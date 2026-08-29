import type { ResolvedCandidateTrack } from "./types";

/**
 * Weighted random sample without replacement, biased toward lower
 * popularity (more obscure), with jitter so repeat runs against identical
 * inputs still vary — this is the "random and interesting, not a relevance
 * sort" requirement. Uses efficient weighted reservoir sampling (A-ES algorithm):
 * each item gets a key = random()^(1/weight); take the top-N by key.
 *
 * `rng` defaults to Math.random but accepts an injected generator for
 * deterministic tests.
 */
export function sampleWeightedByObscurity<
  T extends Pick<ResolvedCandidateTrack, "popularity">
>(candidates: T[], count: number, rng: () => number = Math.random): T[] {
  if (candidates.length <= count) return [...candidates];

  const EPSILON = 1; // avoid divide-by-zero / infinite weight at popularity 0
  const keyed = candidates.map((item) => {
    const weight = 1 / (item.popularity + EPSILON);
    const u = rng();
    // guard against u === 0 (log/pow of 0 would break the ranking)
    const safeU = u <= 0 ? Number.EPSILON : u;
    const key = Math.pow(safeU, 1 / weight);
    return { item, key };
  });

  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, count).map((k) => k.item);
}
