import type { DiscoveryResult } from "@/lib/discovery/types";

export function ResultCard({ track }: { track: DiscoveryResult }) {
  return (
    <a
      href={track.spotifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl bg-surface border-t-4 border-teal-strong overflow-hidden
                 hover:border-pink-strong transition-colors"
    >
      <div className="aspect-square bg-surface-raised">
        {track.albumImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Spotify CDN, not worth next/image config for a v1
          <img
            src={track.albumImageUrl}
            alt={`${track.trackName} album art`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-purple text-4xl">
            🎵
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-display text-base text-foreground truncate">{track.trackName}</p>
        <p className="text-sm text-foreground-muted truncate">{track.artistName}</p>
        <p className="text-xs text-teal mt-1">popularity {track.popularity}</p>
      </div>
    </a>
  );
}
