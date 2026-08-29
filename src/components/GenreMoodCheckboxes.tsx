"use client";

interface GenreMoodCheckboxesProps {
  options: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}

export function GenreMoodCheckboxes({
  options,
  selected,
  onToggle,
}: GenreMoodCheckboxesProps) {
  if (options.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        No tags to show yet — pick some seed artists above first.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {options.map((tag) => {
        const isChecked = selected.includes(tag);
        return (
          <label
            key={tag}
            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm cursor-pointer transition-colors
              ${
                isChecked
                  ? "border-pink-strong bg-surface-raised"
                  : "border-surface-raised bg-surface hover:border-teal"
              }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggle(tag)}
              className="accent-pink-strong w-4 h-4"
            />
            <span className={isChecked ? "text-pink font-semibold" : "text-foreground"}>
              {tag}
            </span>
          </label>
        );
      })}
    </div>
  );
}
