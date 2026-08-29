"use client";

interface Seed {
  id: string;
  name: string;
}

interface SeedSelectorProps {
  seeds: Seed[];
  selected: string[];
  onToggle: (id: string) => void;
  max: number;
}

export function SeedSelector({ seeds, selected, onToggle, max }: SeedSelectorProps) {
  return (
    <div>
      <p className="text-foreground-muted mb-3">
        Pick up to {max} artists to build outward from ({selected.length}/{max} selected)
      </p>
      <div className="flex flex-wrap gap-3">
        {seeds.map((seed) => {
          const isSelected = selected.includes(seed.id);
          const disabled = !isSelected && selected.length >= max;
          return (
            <button
              key={seed.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(seed.id)}
              aria-pressed={isSelected}
              className={`rounded-full px-4 py-2 text-sm border-2 transition-colors
                ${
                  isSelected
                    ? "bg-teal-strong text-background border-teal-strong font-semibold"
                    : "bg-surface text-foreground border-surface-raised hover:border-teal"
                }
                ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {isSelected ? "✓ " : ""}
              {seed.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
