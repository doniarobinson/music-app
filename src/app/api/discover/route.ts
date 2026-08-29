import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getArtistInfo,
  getSimilarArtists,
  getTopArtistsForTag,
  getTopTags,
  getTopTracksForArtist,
} from "@/lib/lastfm/client";
import { findTrackPreview } from "@/lib/deezer/client";
import { runDiscoveryPipeline } from "@/lib/discovery/pipeline";

const MAX_SEED_ARTISTS = 5;

const requestSchema = z
  .object({
    seedArtists: z.array(z.object({ name: z.string() })).max(MAX_SEED_ARTISTS).default([]),
    genreTags: z.array(z.string()).default([]),
    moodTags: z.array(z.string()).default([]),
    obscuritySlider: z.number().min(0).max(100),
  })
  .refine((v) => v.seedArtists.length > 0 || v.genreTags.length + v.moodTags.length > 0, {
    message: "Pick at least one seed artist or one genre/mood tag",
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
    const results = await runDiscoveryPipeline(parsed.data, {
      getSimilarArtists,
      getTopTags,
      getTopArtistsForTag,
      getArtistInfo,
      getTopTracksForArtist,
      findTrackPreview,
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[/api/discover]", err);
    return NextResponse.json({ error: "discovery_failed" }, { status: 502 });
  }
}
