"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResultCard } from "@/components/ResultCard";
import { DISCOVERY_PARAMS_KEY, DISCOVERY_RESULTS_KEY } from "@/lib/discoveryStorage";
import type { DiscoveryResult } from "@/lib/discovery/types";

export default function ResultsPage() {
  const [results, setResults] = useState<DiscoveryResult[] | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Deliberately reading localStorage in an effect rather than a lazy
    // useState initializer: this page is statically prerendered, so a lazy
    // initializer would run during SSR (no `localStorage`, no results),
    // and re-running it on the client synchronously would then mismatch
    // the prerendered "loading" HTML during hydration. Deferring to an
    // effect keeps the first client render consistent with the server's.
    const raw = localStorage.getItem(DISCOVERY_RESULTS_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResults(JSON.parse(raw));
        return;
      } catch {
        // fall through to empty state
      }
    }
    setResults([]);
  }, []);

  async function regenerate() {
    const rawParams = localStorage.getItem(DISCOVERY_PARAMS_KEY);
    if (!rawParams) return;

    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: rawParams,
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setResults(data.results);
      localStorage.setItem(DISCOVERY_RESULTS_KEY, JSON.stringify(data.results));
    } catch {
      setError("Couldn't fetch a new batch — try again in a moment.");
    } finally {
      setRegenerating(false);
    }
  }

  if (results === null) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-foreground-muted">Loading…</p>
      </main>
    );
  }

  if (results.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-foreground-muted">
          No results to show yet — start with the questionnaire.
        </p>
        <Link href="/questionnaire" className="text-teal underline">
          Go pick some seeds
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-16 flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="font-display text-4xl">
          <span className="text-teal">Your</span> <span className="text-pink">deep cuts</span>
        </h1>
        <button
          type="button"
          onClick={regenerate}
          disabled={regenerating}
          className="rounded-full px-6 py-2 font-display text-xl text-background
                     bg-gradient-to-r from-teal-strong to-purple-strong
                     disabled:opacity-40 transition-transform hover:enabled:scale-[1.03]"
        >
          {regenerating ? "Digging…" : "🎲 Regenerate"}
        </button>
      </div>

      {error && (
        <p className="text-danger text-center" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {results.map((track) => (
          <ResultCard key={track.spotifyTrackId} track={track} />
        ))}
      </div>
    </main>
  );
}
