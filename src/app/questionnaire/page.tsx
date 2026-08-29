"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArtistSeedInput } from "@/components/ArtistSeedInput";
import { ObscuritySlider } from "@/components/ObscuritySlider";
import { GenreMoodCheckboxes } from "@/components/GenreMoodCheckboxes";
import { GENRE_TAGS, MOOD_TAGS } from "@/lib/curatedTags";
import { DISCOVERY_PARAMS_KEY, DISCOVERY_RESULTS_KEY } from "@/lib/discoveryStorage";

const MAX_SEEDS = 5;

export default function QuestionnairePage() {
  const router = useRouter();
  const [seedArtists, setSeedArtists] = useState<string[]>([]);
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [obscuritySlider, setObscuritySlider] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toggleGenre(tag: string) {
    setGenreTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function toggleMood(tag: string) {
    setMoodTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  const canSubmit = seedArtists.length > 0 || genreTags.length + moodTags.length > 0;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const params = {
      seedArtists: seedArtists.map((name) => ({ name })),
      genreTags,
      moodTags,
      obscuritySlider,
    };

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
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

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16 flex flex-col gap-12">
      <h1 className="font-display text-4xl text-center">
        <span className="text-pink">Tune</span> the dig
      </h1>

      <section>
        <h2 className="font-display text-xl text-teal mb-4">1. Genre</h2>
        <GenreMoodCheckboxes options={[...GENRE_TAGS]} selected={genreTags} onToggle={toggleGenre} />
      </section>

      <section>
        <h2 className="font-display text-xl text-teal mb-4">2. Mood</h2>
        <GenreMoodCheckboxes options={[...MOOD_TAGS]} selected={moodTags} onToggle={toggleMood} />
      </section>

      <section>
        <h2 className="font-display text-xl text-teal mb-4">3. Seed artists</h2>
        <ArtistSeedInput selected={seedArtists} onChange={setSeedArtists} max={MAX_SEEDS} />
      </section>

      <section>
        <h2 className="font-display text-xl text-teal mb-4">4. How deep?</h2>
        <ObscuritySlider value={obscuritySlider} onChange={setObscuritySlider} />
      </section>

      {!canSubmit && (
        <p className="text-foreground-muted text-center text-sm">
          Pick at least one genre/mood tag or one seed artist to search from.
        </p>
      )}

      {submitError && (
        <p className="text-danger text-center" role="alert">
          {submitError}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
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
