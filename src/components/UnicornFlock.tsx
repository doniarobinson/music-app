import type { CSSProperties } from "react";

// Staggered start position/timing per unicorn so the group reads as a loose
// scattering flock rather than one sprite duplicated in place. Size and
// color are uniform across all of them (see .unicorn-flock-item's rainbow-
// ombre gradient in globals.css) — only position/timing vary.
const FLOCK = [
  { left: -6, bottom: -8, delayS: 0, durationS: 3.2 },
  { left: -2, bottom: -16, delayS: 0.5, durationS: 3.6 },
  { left: -10, bottom: -2, delayS: 1.0, durationS: 3.0 },
  { left: 2, bottom: -12, delayS: 1.6, durationS: 3.4 },
  { left: -8, bottom: -20, delayS: 0.9, durationS: 3.8 },
] as const;

const UNICORN_SIZE = 56;

/**
 * A continuous loading flourish: puffy-sticker unicorns loop from the
 * bottom-left corner off past the top-right for as long as this stays
 * mounted — shown on the questionnaire page while /api/discover is in
 * flight, since that wait has no fixed duration. Fixed/pointer-events-none
 * so it overlays without blocking anything, and purely decorative
 * (aria-hidden) — the "Digging…" text label carries the actual
 * loading-state semantics.
 *
 * Reduced-motion users don't get nothing: globals.css swaps the flight
 * animation for a calm static row of the same unicorns via the
 * `unicorn-flock-container` / `unicorn-flock-item` classes below.
 */
export function UnicornFlock() {
  return (
    <div
      className="unicorn-flock-container fixed inset-0 z-50 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {FLOCK.map((u, i) => (
        <span
          key={i}
          className="unicorn-flock-item"
          style={
            {
              left: `${u.left}%`,
              bottom: `${u.bottom}%`,
              width: UNICORN_SIZE,
              height: UNICORN_SIZE,
              fontSize: UNICORN_SIZE * 0.55,
              animationDelay: `${u.delayS}s`,
              animationDuration: `${u.durationS}s`,
            } as CSSProperties
          }
        >
          🦄
        </span>
      ))}
    </div>
  );
}
