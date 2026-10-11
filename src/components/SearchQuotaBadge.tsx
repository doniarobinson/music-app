interface SearchQuotaBadgeProps {
  remaining: number | null;
  dailyLimit: number;
  /** Cross-axis alignment within its flex parent. Defaults to centering itself (for parents that don't set their own `items-*`); pass "" to defer to the parent's alignment instead. */
  selfAlign?: string;
}

/** Informational only — never disables searching, just shows where the self-imposed daily cap stands. */
export function SearchQuotaBadge({ remaining, dailyLimit, selfAlign = "self-center" }: SearchQuotaBadgeProps) {
  if (remaining === null) return null;

  return (
    <div
      className={`${selfAlign} inline-flex items-center gap-2 rounded-full px-5 py-2
                 bg-surface border-2 border-teal-strong/50 font-display text-base text-foreground-muted`}
    >
      🔍 <span className="text-foreground font-semibold">{remaining}</span> of {dailyLimit} searches left
      today
    </div>
  );
}
