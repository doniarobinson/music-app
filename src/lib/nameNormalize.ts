/**
 * Normalizes an artist/track name for cross-service matching (Last.fm keys
 * off names, Spotify off IDs). Strips diacritics, punctuation, a leading
 * "the", and collapses whitespace/case so "Sigur Rós" ~= "sigur ros" and
 * "The Beatles" ~= "Beatles".
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if two names normalize to the same string. */
export function namesMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}
