"use client";

import { choiceLabel } from "@/src/features/workspace/conversation/helpers";
import { useListKeys } from "@/src/features/workspace/conversation/useListKeys";
import { cn } from "@/src/lib/cn";

export function ChoiceInstrument({
  question,
  options,
  field,
  disabled,
  onPick,
}: {
  question: string;
  options: string[];
  field: string;
  disabled?: boolean;
  onPick: (field: string, value: string) => void;
}) {
  const { active, setActive } = useListKeys({
    count: options.length,
    disabled,
    enableDigits: true,
    onConfirm: (index) => {
      const value = options[index];
      if (value) onPick(field, value);
    },
  });

  return (
    <div role="radiogroup" aria-label={question} tabIndex={0} className="outline-none">
      <p className="text-sm leading-6 text-muted">{question}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option, index) => {
          const selected = active === index;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onMouseEnter={() => setActive(index)}
              onClick={() => onPick(field, option)}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-[14px] border p-1.5 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                selected ? "border-accent bg-elevated shadow-[0_18px_50px_oklch(0.12_0.03_265/0.45)]" : "border-border bg-surface",
                disabled && "opacity-50",
              )}
            >
              <span className="flex min-h-11 flex-1 items-center gap-3 rounded-[10px] bg-elevated px-3">
                <span className={cn("font-mono text-[11px]", selected ? "text-accent" : "text-subtle")}>
                  {index + 1}
                </span>
                <span className={cn("text-[15px]", selected ? "text-text" : "text-muted")}>
                  {choiceLabel(field, option)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[11px] text-subtle">
        1 to {options.length} to answer. Arrow keys to move. Or type it below.
      </p>
    </div>
  );
}
