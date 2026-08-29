import { normalizeName } from "@/lib/nameNormalize";
import type { CandidateArtist, SeedArtist } from "./types";

export interface SimilarityGraphLimits {
  /** How many hops out from each seed to walk (seed -> similar -> similar-of-similar = depth 2). */
  depth: number;
  /** How many similar artists to pull per node. */
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

type GetSimilarFn = (artistName: string, limit?: number) => Promise<{ name: string }[]>;

/**
 * Breadth-first walk over Last.fm's similar-artist graph, starting from the
 * user's seed artists. Depth/breadth-capped to keep external API call count
 * bounded (this is the primary defense against Last.fm rate-limit fanout —
 * see pipeline.ts for the concurrency limiter around the actual fetches).
 */
export async function walkSimilarityGraph(
  seeds: SeedArtist[],
  getSimilar: GetSimilarFn,
  limits: SimilarityGraphLimits = DEFAULT_GRAPH_LIMITS
): Promise<CandidateArtist[]> {
  const seen = new Set<string>(seeds.map((s) => normalizeName(s.name)));
  const results = new Map<string, CandidateArtist>();

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
        similar = await getSimilar(node.name, limits.similarPerNode);
      } catch {
        continue; // graceful degradation: skip this node, keep walking the rest
      }

      // Defensively enforce the breadth cap ourselves — don't trust an
      // injected/mocked dependency to actually honor the requested limit.
      for (const s of similar.slice(0, limits.similarPerNode)) {
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
