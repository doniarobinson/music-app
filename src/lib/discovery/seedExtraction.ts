import { normalizeName } from "@/lib/nameNormalize";
import type { SeedArtist } from "./types";

interface RawArtistLike {
  id: string;
  name: string;
}

/**
 * Merges top-artists (across time ranges) and saved-track artists into a
 * deduped, ranked seed candidate list for the questionnaire's seed picker.
 * Ranking favors artists appearing across more sources/time ranges (a proxy
 * for "core to this user's taste" rather than a one-off skip).
 */
export function extractSeedCandidates(sources: {
  topArtistsByTimeRange: RawArtistLike[][];
  savedTrackArtists: RawArtistLike[];
}): SeedArtist[] {
  const scoreByNormalizedName = new Map<string, { artist: RawArtistLike; score: number }>();

  const bump = (artist: RawArtistLike, weight: number) => {
    const key = normalizeName(artist.name);
    if (!key) return;
    const existing = scoreByNormalizedName.get(key);
    if (existing) {
      existing.score += weight;
    } else {
      scoreByNormalizedName.set(key, { artist, score: weight });
    }
  };

  for (const list of sources.topArtistsByTimeRange) {
    for (const artist of list) bump(artist, 2);
  }
  for (const artist of sources.savedTrackArtists) {
    bump(artist, 1);
  }

  return Array.from(scoreByNormalizedName.values())
    .sort((a, b) => b.score - a.score)
    .map(({ artist }) => ({ id: artist.id, name: artist.name }));
}
