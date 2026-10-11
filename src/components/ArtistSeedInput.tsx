"use client";

import { useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
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

  function handleQueryChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Nothing to fetch for an empty query — rather than synchronously
    // resetting `suggestions` state here, the empty case is handled at
    // render time below (`visibleSuggestions`) so stale results just don't
    // get shown rather than needing to be cleared.
    if (!value.trim()) return;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/artist-search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setSuggestions((data.artists ?? []).map((a: { name: string }) => a.name));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

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
        // Using the lower-level Combobox (not the Autocomplete convenience
        // wrapper): Autocomplete conflates "input text" and "selected value"
        // into one controlled `value`, and unconditionally fills the input
        // with whatever was picked — fine for a single-value autocomplete,
        // wrong here, where picking a suggestion should add a chip and leave
        // the input free for the next search. Combobox keeps input text
        // (`inputValue`/`onInputValueChange`) and selection fully separate,
        // so selecting an item never touches what's typed. We don't use
        // Combobox's own selection state at all (no `value`/`onValueChange`
        // here) — `addArtist`/`removeArtist` below still own that, via the
        // existing `selected`/`onChange` props, same as before this refactor.
        <Combobox.Root
          inputValue={query}
          onInputValueChange={handleQueryChange}
          items={visibleSuggestions}
          filter={null}
          multiple
        >
          <div className="relative">
            <Combobox.Input
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
          </div>
          <Combobox.Portal>
            <Combobox.Positioner className="z-10 w-[var(--anchor-width)]" sideOffset={4}>
              <Combobox.Popup className="rounded-lg bg-surface-raised border border-surface-raised overflow-hidden">
                <Combobox.List>
                  {visibleSuggestions.map((name) => (
                    <Combobox.Item
                      key={name}
                      value={name}
                      onClick={() => addArtist(name)}
                      className="px-4 py-2 text-foreground hover:bg-surface hover:text-teal
                                 data-[highlighted]:bg-surface data-[highlighted]:text-teal cursor-pointer"
                    >
                      {name}
                    </Combobox.Item>
                  ))}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
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
