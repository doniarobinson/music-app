interface SearchQuotaBadgeProps {
  remaining: number | null;
  dailyLimit: number;
}

/** Informational only — never disables searching, just shows where the self-imposed daily cap stands. */
export function SearchQuotaBadge({ remaining, dailyLimit }: SearchQuotaBadgeProps) {
  if (remaining === null) return null;

  return (
    <div
      className="self-center inline-flex items-center gap-2 rounded-full px-5 py-2
                 bg-surface border-2 border-teal-strong/50 font-display text-base text-foreground-muted"
    >
      🔍 <span className="text-foreground font-semibold">{remaining}</span> of {dailyLimit} searches left
      today
    </div>
  );
}
