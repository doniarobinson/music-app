"use client";

interface ObscuritySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function ObscuritySlider({ value, onChange }: ObscuritySliderProps) {
  return (
    <div>
      <div className="flex justify-between text-sm text-foreground-muted mb-2">
        <span>🦄 deep cuts</span>
        <span>mainstream 📻</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Obscurity ceiling: lower values surface more obscure music"
        className="w-full h-3 rounded-full appearance-none cursor-pointer accent-pink-strong
                   bg-gradient-to-r from-teal-strong via-purple-strong to-pink-strong"
      />
      <p className="mt-2 text-center font-display text-purple">
        Obscurity level: {value}
      </p>
    </div>
  );
}
