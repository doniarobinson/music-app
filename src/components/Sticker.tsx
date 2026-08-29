import type { CSSProperties } from "react";

type StickerKind = "star" | "bolt" | "heart" | "burst" | "note" | "cassette";

interface StickerProps {
  kind: StickerKind;
  /** Fill color — pass one of the CSS var-backed accent colors. */
  color?: "pink" | "teal" | "purple";
  size?: number;
  /** Slight tilt for a "slapped on" sticker feel. */
  rotate?: number;
  className?: string;
}

const COLOR_MAP: Record<NonNullable<StickerProps["color"]>, { fill: string; highlight: string }> = {
  pink: { fill: "var(--pink-strong)", highlight: "#ffc2e3" },
  teal: { fill: "var(--teal-strong)", highlight: "#c6fff6" },
  purple: { fill: "var(--purple-strong)", highlight: "#ecdcff" },
};

const PATHS: Record<StickerKind, string> = {
  star: "M50 6 L61 38 L96 38 L67 58 L78 92 L50 71 L22 92 L33 58 L4 38 L39 38 Z",
  bolt: "M58 4 L22 56 L46 56 L38 96 L82 42 L56 42 Z",
  heart:
    "M50 92 C10 64 6 36 26 22 C38 14 48 20 50 30 C52 20 62 14 74 22 C94 36 90 64 50 92 Z",
  burst:
    "M50 2 L58 24 L80 12 L70 34 L94 38 L74 50 L94 62 L70 66 L80 88 L58 76 L50 98 L42 76 L20 88 L30 66 L6 62 L26 50 L6 38 L30 34 L20 12 L42 24 Z",
  note: "M40 78 a12 10 0 1 1 -1 -10 L39 20 L78 12 L78 60 a12 10 0 1 1 -8 -9.6 L70 26 L47 31 L47 68 Z",
  cassette:
    "M6 20 h88 a4 4 0 0 1 4 4 v52 a4 4 0 0 1 -4 4 H6 a4 4 0 0 1 -4 -4 V24 a4 4 0 0 1 4 -4 Z M32 46 a12 12 0 1 0 0.1 0 Z M68 46 a12 12 0 1 0 0.1 0 Z",
};

/**
 * Decorative 80s "puffy sticker" accents, built as inline SVG rather than
 * raster images — stays crisp at any size, matches our exact palette, and
 * needs no external assets or licensing. Layered to actually read as
 * "puffy": a soft dark halo (die-cut edge), a glossy radial-gradient body,
 * a thick light outline on top, and a fixed glossy shine spot clipped to
 * the shape — same recipe real puffy vinyl stickers use.
 */
export function Sticker({ kind, color = "pink", size = 64, rotate = -8, className = "" }: StickerProps) {
  const { fill, highlight } = COLOR_MAP[color];
  const uid = `${kind}-${color}`;
  const gradientId = `sticker-gloss-${uid}`;
  const clipId = `sticker-clip-${uid}`;
  const d = PATHS[kind];

  return (
    <svg
      viewBox="-8 -8 116 116"
      width={size}
      height={size}
      style={{ "--sticker-rotate": `${rotate}deg` } as CSSProperties}
      className={`sticker-wiggle ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="45%" stopColor={fill} />
          <stop offset="100%" stopColor={fill} />
        </radialGradient>
        <clipPath id={clipId}>
          <path d={d} fillRule="evenodd" />
        </clipPath>
      </defs>

      {/* soft dark halo standing in for a drop shadow + die-cut edge */}
      <path
        d={d}
        fill="none"
        stroke="rgba(0,0,0,0.45)"
        strokeWidth={12}
        strokeLinejoin="round"
        transform="translate(1.5 2.5)"
      />

      {/* puffy glossy body */}
      <path
        d={d}
        fill={`url(#${gradientId})`}
        fillRule="evenodd"
        stroke="var(--foreground)"
        strokeWidth={5}
        strokeLinejoin="round"
      />

      {/* fixed glossy shine, clipped to the shape's own outline */}
      <g clipPath={`url(#${clipId})`}>
        <ellipse cx="32" cy="26" rx="22" ry="13" fill="#ffffff" opacity="0.5" />
      </g>
    </svg>
  );
}
