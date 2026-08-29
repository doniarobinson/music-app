/**
 * Runs a bounded async task pool so we never burst past a handful of
 * concurrent requests to an external API at once. Shared by every discovery
 * stage that fans out one request per candidate — previously only the
 * pipeline's track-resolution stage had this, leaving the tag-filter and
 * listener-lookup stages fully sequential (one full network round-trip at a
 * time), which is what made a 200-candidate pool take well over a minute.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
