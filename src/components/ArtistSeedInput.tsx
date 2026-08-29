"use client";

import { useEffect, useRef, useState } from "react";
import { STARTER_ARTISTS } from "@/lib/curatedTags";

interface ArtistSeedInputProps {
  selected: string[];
  onChange: (artists: string[]) => void;
  max: number;
}

export function ArtistSeedInput({ selected, onChange, max }: ArtistSeedInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Nothing to fetch for an empty query — rather than synchronously
    // resetting `suggestions` state here, the empty case is handled at
    // render time below (`visibleSuggestions`) so stale results just don't
    // get shown rather than needing to be cleared.
    if (!query.trim()) return;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/artist-search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions((data.artists ?? []).map((a: { name: string }) => a.name));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const atMax = selected.length >= max;
  // Hides stale/leftover suggestions once the query is cleared, without
  // needing to reset `suggestions` state synchronously anywhere.
  const visibleSuggestions = query.trim() ? suggestions : [];

  function addArtist(name: string) {
    if (atMax || selected.some((s) => s.toLowerCase() === name.toLowerCase())) return;
    onChange([...selected, name]);
    setQuery("");
  }

  function removeArtist(name: string) {
    onChange(selected.filter((s) => s !== name));
  }

  return (
    <div>
      <p className="text-foreground-muted mb-3">
        Optional — type in up to {max} artists to refine the search
        ({selected.length}/{max})
      </p>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((name) => (
            <span
              key={name}
              className="flex items-center gap-2 rounded-full bg-teal-strong text-background
                         px-4 py-2 text-sm font-semibold"
            >
              {name}
              <button
                type="button"
                onClick={() => removeArtist(name)}
                aria-label={`Remove ${name}`}
                className="text-background/70 hover:text-background"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {!atMax && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type an artist name…"
            className="w-full rounded-lg bg-surface border-2 border-surface-raised
                       px-4 py-2 text-foreground placeholder:text-foreground-muted
                       focus:border-teal outline-none"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">
              …
            </span>
          )}
          {visibleSuggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg bg-surface-raised border border-surface-raised overflow-hidden">
              {visibleSuggestions.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => addArtist(name)}
                    className="w-full text-left px-4 py-2 text-foreground hover:bg-surface hover:text-teal"
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs text-foreground-muted mb-2">or start from:</p>
        <div className="flex flex-wrap gap-2">
          {STARTER_ARTISTS.filter(
            (name) => !selected.some((s) => s.toLowerCase() === name.toLowerCase())
          ).map((name) => (
            <button
              key={name}
              type="button"
              disabled={atMax}
              onClick={() => addArtist(name)}
              className="rounded-full px-3 py-1.5 text-sm border-2 border-surface-raised
                         bg-surface text-foreground-muted hover:border-purple hover:text-purple
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
