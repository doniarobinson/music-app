/**
 * Filters candidates to the slider's percentile of THIS pool's own listener
 * distribution, rather than a fixed absolute listener-count threshold.
 *
 * An earlier version used an absolute log-scale threshold (e.g. "under 2,000
 * listeners"), but Last.fm's tag charts only ever surface artists popular
 * enough to have a meaningful tag ranking at all — for a typical genre/mood
 * pair, the LEAST popular artist Last.fm returns can easily have several
 * thousand listeners. A fixed "obscure" floor could be stricter than every
 * single candidate a query returns, silently producing zero results no
 * matter what the user picked. Percentile-relative filtering means "how
 * obscure" always means "less popular than most of what we found for this
 * particular search," and — short of an empty pool to begin with — can
 * never zero out every candidate on its own.
 */
const MIN_KEPT = 8;

export function filterByObscurity<T extends { listeners: number }>(
  candidates: T[],
  obscuritySlider: number
): T[] {
  if (candidates.length === 0) return [];

  const clamped = Math.min(100, Math.max(0, obscuritySlider));
  const sorted = [...candidates].sort((a, b) => a.listeners - b.listeners);

  // Always keep at least a handful of candidates, even at slider 0 — so a
  // maximally "obscure-only" request still returns something rather than
  // a near-empty sliver of the pool.
  const keepCount = Math.max(Math.min(MIN_KEPT, sorted.length), Math.round(sorted.length * (clamped / 100)));

  return sorted.slice(0, keepCount);
}
