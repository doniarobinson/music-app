/**
 * Last.fm listener counts span single digits to tens of millions, so the
 * 0-100 obscurity slider maps onto a listener-count ceiling on a log scale
 * rather than linearly (a linear mapping would put ~99% of real artists in
 * the bottom few slider percent). At slider 100 there's no ceiling at all —
 * some legitimately huge artists have listener counts well past any finite
 * cap we'd otherwise pick, and "mainstream" end of the slider should mean
 * "no filter," not "still excludes the biggest artists on Last.fm."
 */
const MIN_LISTENERS = 200;
const MAX_LISTENERS = 20_000_000;

export function sliderToListenerCeiling(slider: number): number {
  const clamped = Math.min(100, Math.max(0, slider));
  if (clamped >= 100) return Infinity;
  const ratio = clamped / 100;
  return Math.round(MIN_LISTENERS * Math.pow(MAX_LISTENERS / MIN_LISTENERS, ratio));
}

/**
 * Drops candidates more popular (by listener count) than the slider's
 * ceiling. Boundary is inclusive (listeners === ceiling passes).
 */
export function filterByObscurity<T extends { listeners: number }>(
  candidates: T[],
  obscuritySlider: number
): T[] {
  const ceiling = sliderToListenerCeiling(obscuritySlider);
  return candidates.filter((c) => c.listeners <= ceiling);
}
