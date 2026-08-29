/**
 * Curated genre/mood tag lists and starter-artist shortcuts. Static rather
 * than derived from a user's library (there's no login/account anymore) —
 * these map directly onto Last.fm folksonomy tags used by tagCandidates.ts
 * and tagFilter.ts.
 */

export const GENRE_TAGS = [
  "indie rock",
  "electronic",
  "hip hop",
  "jazz",
  "ambient",
  "punk",
  "folk",
  "metal",
  "r&b",
  "techno",
  "shoegaze",
  "post-punk",
  "soul",
  "classical",
  "reggae",
  "country",
  "pop",
  "disco",
  "experimental",
  "lo-fi",
] as const;

export const MOOD_TAGS = [
  "chill",
  "melancholic",
  "upbeat",
  "dark",
  "dreamy",
  "energetic",
  "romantic",
  "aggressive",
  "nostalgic",
  "party",
] as const;

/** One-click starting points for users unsure who to type in. */
export const STARTER_ARTISTS = [
  "Radiohead",
  "Kendrick Lamar",
  "Fleetwood Mac",
  "Boards of Canada",
  "Beach House",
  "Miles Davis",
  "Tame Impala",
  "Joy Division",
] as const;
