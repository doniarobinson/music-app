import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSavedTracks,
  getTopArtists,
  getTopTracks,
  searchArtistByName,
  searchTracksByArtist,
  SpotifyAuthError,
} from "@/lib/spotify/client";
import { getSimilarArtists, getTopTags } from "@/lib/lastfm/client";
import { runDiscoveryPipeline } from "@/lib/discovery/pipeline";

const MAX_SEED_ARTISTS = 5;

const requestSchema = z.object({
  seedArtists: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .min(1)
    .max(MAX_SEED_ARTISTS),
  obscurityMax: z.number().min(0).max(100),
  genreTags: z.array(z.string()).default([]),
  moodTags: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // Re-fetch the user's library fresh (no cache/DB) to dedupe results
    // against what they already listen to.
    const [topArtists, topTracks, savedTracks] = await Promise.all([
      getTopArtists("long_term", 50),
      getTopTracks("long_term", 50),
      getSavedTracks(50),
    ]);

    const library = {
      trackIds: new Set([...topTracks, ...savedTracks].map((t) => t.id)),
      artistIds: new Set(topArtists.map((a) => a.id)),
    };

    const results = await runDiscoveryPipeline(
      {
        seedArtists: parsed.data.seedArtists,
        obscurityMax: parsed.data.obscurityMax,
        genreTags: parsed.data.genreTags,
        moodTags: parsed.data.moodTags,
      },
      {
        getSimilarArtists,
        getTopTags,
        searchArtistByName,
        searchTracksByArtist,
      },
      library
    );

    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof SpotifyAuthError) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }
    console.error("[/api/discover]", err);
    return NextResponse.json({ error: "discovery_failed" }, { status: 502 });
  }
}
