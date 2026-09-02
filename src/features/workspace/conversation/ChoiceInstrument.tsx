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
      <div className="mt-3 divide-y divide-border border-y border-border">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active === index}
            disabled={disabled}
            onMouseEnter={() => setActive(index)}
            onClick={() => onPick(field, option)}
            className={cn(
              "flex min-h-11 w-full items-center gap-4 py-3 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              active === index ? "text-text" : "text-muted",
              disabled && "opacity-50",
            )}
          >
            <span className={cn("h-px w-6 shrink-0", active === index ? "bg-accent" : "bg-border")} />
            <span className="text-[15px]">{choiceLabel(field, option)}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] text-subtle">
        1 to {options.length} to answer. Arrow keys to move. Or type it below.
      </p>
    </div>
  );
}
