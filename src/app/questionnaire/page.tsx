"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SeedSelector } from "@/components/SeedSelector";
import { ObscuritySlider } from "@/components/ObscuritySlider";
import { GenreMoodCheckboxes } from "@/components/GenreMoodCheckboxes";
import { DISCOVERY_PARAMS_KEY, DISCOVERY_RESULTS_KEY } from "@/lib/discoveryStorage";

const MAX_SEEDS = 5;

interface Seed {
  id: string;
  name: string;
}

export default function QuestionnairePage() {
  const router = useRouter();
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [selectedSeedIds, setSelectedSeedIds] = useState<string[]>([]);
  const [obscurityMax, setObscurityMax] = useState(40);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unauthenticated">(
    "loading"
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/seeds")
      .then(async (res) => {
        if (res.status === 401) {
          setLoadState("unauthenticated");
          return;
        }
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setSeeds(data.seeds);
        setTagOptions(data.tagOptions);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, []);

  useEffect(() => {
    if (loadState === "unauthenticated") {
      router.replace("/login");
    }
  }, [loadState, router]);

  function toggleSeed(id: string) {
    setSelectedSeedIds((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : prev.length < MAX_SEEDS
          ? [...prev, id]
          : prev
    );
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const seedArtists = seeds.filter((s) => selectedSeedIds.includes(s.id));
    const params = {
      seedArtists,
      obscurityMax,
      genreTags: selectedTags,
      moodTags: [] as string[],
    };

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error("discovery request failed");
      const data = await res.json();

      localStorage.setItem(DISCOVERY_PARAMS_KEY, JSON.stringify(params));
      localStorage.setItem(DISCOVERY_RESULTS_KEY, JSON.stringify(data.results));
      router.push("/results");
    } catch {
      setSubmitError("Couldn't put together a list just now — mind trying again?");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState === "loading" || loadState === "unauthenticated") {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-foreground-muted">Loading your listening history…</p>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-danger">Couldn&apos;t load your Spotify data. Please refresh.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16 flex flex-col gap-12">
      <h1 className="font-display text-4xl text-center">
        <span className="text-pink">Tune</span> the dig
      </h1>

      <section>
        <h2 className="font-display text-xl text-teal mb-4">1. Seed artists</h2>
        <SeedSelector
          seeds={seeds}
          selected={selectedSeedIds}
          onToggle={toggleSeed}
          max={MAX_SEEDS}
        />
      </section>

      <section>
        <h2 className="font-display text-xl text-teal mb-4">2. How deep?</h2>
        <ObscuritySlider value={obscurityMax} onChange={setObscurityMax} />
      </section>

      <section>
        <h2 className="font-display text-xl text-teal mb-4">3. Genre &amp; mood</h2>
        <GenreMoodCheckboxes options={tagOptions} selected={selectedTags} onToggle={toggleTag} />
      </section>

      {submitError && (
        <p className="text-danger text-center" role="alert">
          {submitError}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={selectedSeedIds.length === 0 || submitting}
        className="self-center rounded-full px-10 py-4 font-display text-2xl text-background
                   bg-gradient-to-r from-pink-strong to-teal-strong
                   disabled:opacity-40 disabled:cursor-not-allowed
                   transition-transform hover:enabled:scale-[1.03]"
      >
        {submitting ? "Digging…" : "Find deep cuts"}
      </button>
    </main>
  );
}
