import { normalizeName } from "@/lib/nameNormalize";
import type { CandidateArtist, SeedArtist } from "./types";

export interface SimilarityGraphLimits {
  /** How many hops out from each seed to walk (seed -> similar -> similar-of-similar = depth 2). */
  depth: number;
  /** How many similar artists to keep per node, after randomly sampling from a wider fetch. */
  similarPerNode: number;
  /** Hard cap on total unique candidates returned, regardless of graph size. */
  maxCandidates: number;
}

// Kept modest on purpose: every candidate here still needs a listener
// lookup and (if it survives) a top-tracks + Deezer-preview resolution —
// 80 candidates is already generous headroom for a ~24-track final sample,
// and keeps a full discovery run from taking well over a minute.
export const DEFAULT_GRAPH_LIMITS: SimilarityGraphLimits = {
  depth: 2,
  similarPerNode: 8,
  maxCandidates: 80,
};

// How much wider a pool to fetch per node before randomly sampling
// similarPerNode out of it — see the note on determinism below.
const FETCH_MULTIPLIER = 3;
const MAX_FETCH_PER_NODE = 30;

type GetSimilarFn = (artistName: string, limit?: number) => Promise<{ name: string }[]>;

function sampleRandom<T>(items: T[], count: number, rng: () => number): T[] {
  if (items.length <= count) return items;
  const pool = [...items];
  // Partial Fisher-Yates: shuffle only as many positions as we need.
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * Breadth-first walk over Last.fm's similar-artist graph, starting from the
 * user's seed artists. Depth/breadth-capped to keep external API call count
 * bounded (this is the primary defense against Last.fm rate-limit fanout —
 * see pipeline.ts for the concurrency limiter around the actual fetches).
 *
 * Last.fm's artist.getSimilar is a fixed, deterministically-ranked list —
 * the same seed always returns the same similar artists in the same order.
 * Originally we just took its top `similarPerNode` results directly, which
 * meant re-running an identical seed (e.g. clicking "Regenerate" on the
 * results page) always walked the exact same graph. Fetching a wider pool
 * per node and randomly sampling down to `similarPerNode` means repeated
 * identical requests can still explore different parts of each seed's
 * neighborhood.
 */
export async function walkSimilarityGraph(
  seeds: SeedArtist[],
  getSimilar: GetSimilarFn,
  limits: SimilarityGraphLimits = DEFAULT_GRAPH_LIMITS,
  rng: () => number = Math.random
): Promise<CandidateArtist[]> {
  const seen = new Set<string>(seeds.map((s) => normalizeName(s.name)));
  const results = new Map<string, CandidateArtist>();
  const fetchLimit = Math.min(limits.similarPerNode * FETCH_MULTIPLIER, MAX_FETCH_PER_NODE);

  let frontier: { name: string; source: string }[] = seeds.map((s) => ({
    name: s.name,
    source: s.name,
  }));

  for (let hop = 0; hop < limits.depth && frontier.length > 0; hop++) {
    const nextFrontier: typeof frontier = [];

    for (const node of frontier) {
      if (results.size >= limits.maxCandidates) break;

      let similar: { name: string }[] = [];
      try {
        similar = await getSimilar(node.name, fetchLimit);
      } catch {
        continue; // graceful degradation: skip this node, keep walking the rest
      }

      const sampled = sampleRandom(similar, limits.similarPerNode, rng);

      for (const s of sampled) {
        const key = normalizeName(s.name);
        if (!key || seen.has(key)) continue;
        seen.add(key);

        if (results.size < limits.maxCandidates) {
          results.set(key, { name: s.name, source: node.source });
        }
        nextFrontier.push({ name: s.name, source: node.source });
      }

      if (results.size >= limits.maxCandidates) break;
    }

    frontier = nextFrontier;
  }

  return Array.from(results.values());
}
