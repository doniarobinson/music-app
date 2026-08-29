import { NextRequest, NextResponse } from "next/server";
import { searchArtists } from "@/lib/lastfm/client";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (!query.trim()) return NextResponse.json({ artists: [] });

  try {
    const artists = await searchArtists(query, 8);
    return NextResponse.json({ artists });
  } catch (err) {
    console.error("[/api/artist-search]", err);
    return NextResponse.json({ error: "search_failed" }, { status: 502 });
  }
}
