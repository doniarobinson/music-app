import { NextResponse } from "next/server";
import { getSavedTracks, getTopArtists, SpotifyAuthError } from "@/lib/spotify/client";
import { getTopTags } from "@/lib/lastfm/client";
import { extractSeedCandidates } from "@/lib/discovery/seedExtraction";

const TAG_SAMPLE_ARTIST_COUNT = 12;

export async function GET() {
  try {
    const [shortTerm, mediumTerm, longTerm, savedTracks] = await Promise.all([
      getTopArtists("short_term"),
      getTopArtists("medium_term"),
      getTopArtists("long_term"),
      getSavedTracks(50),
    ]);

    const savedTrackArtists = savedTracks.flatMap((t) => t.artists);

    const seeds = extractSeedCandidates({
      topArtistsByTimeRange: [shortTerm, mediumTerm, longTerm],
      savedTrackArtists,
    });

    // Sample tags from the user's top artists to populate a personalized
    // genre/mood checkbox list instead of a hardcoded static taxonomy.
    const tagSampleArtists = [...shortTerm, ...mediumTerm]
      .slice(0, TAG_SAMPLE_ARTIST_COUNT)
      .map((a) => a.name);

    const tagFrequency = new Map<string, number>();
    const tagResults = await Promise.allSettled(
      tagSampleArtists.map((name) => getTopTags(name))
    );
    for (const result of tagResults) {
      if (result.status !== "fulfilled") continue;
      for (const tag of result.value.slice(0, 5)) {
        const key = tag.name.toLowerCase();
        tagFrequency.set(key, (tagFrequency.get(key) ?? 0) + 1);
      }
    }

    const tagOptions = Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name]) => name);

    return NextResponse.json({ seeds: seeds.slice(0, 20), tagOptions });
  } catch (err) {
    if (err instanceof SpotifyAuthError) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }
    console.error("[/api/seeds]", err);
    return NextResponse.json({ error: "seeds_fetch_failed" }, { status: 502 });
  }
}
