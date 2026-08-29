"use client";

import { useRef, useState } from "react";
import type { DiscoveryResult } from "@/lib/discovery/types";

export function ResultCard({ track }: { track: DiscoveryResult }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  }

  return (
    <div className="rounded-xl bg-surface border-t-4 border-teal-strong overflow-hidden">
      <div className="aspect-square bg-surface-raised relative">
        {track.albumArtUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Deezer CDN, not worth next/image config for a v1
          <img
            src={track.albumArtUrl}
            alt={`${track.trackName} album art`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-purple text-4xl">
            🎵
          </div>
        )}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? `Pause preview of ${track.trackName}` : `Play preview of ${track.trackName}`}
          className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-pink-strong text-background
                     flex items-center justify-center text-lg font-bold shadow-lg
                     transition-transform hover:scale-110 active:scale-95"
        >
          {playing ? "⏸" : "▶"}
        </button>
        <audio
          ref={audioRef}
          src={track.previewUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      </div>
      <div className="p-3">
        <p className="font-display text-base text-foreground truncate">{track.trackName}</p>
        <p className="text-sm text-foreground-muted truncate">{track.artistName}</p>
        <a
          href={track.lastfmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal mt-1 inline-block hover:underline"
        >
          more on Last.fm ↗
        </a>
      </div>
    </div>
  );
}
