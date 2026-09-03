"use client";

import { motion, useReducedMotion } from "motion/react";
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
  const reduce = useReducedMotion();
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
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option, index) => {
          const selected = active === index;
          return (
            <motion.button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.32, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => setActive(index)}
              onClick={() => onPick(field, option)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[15px] transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                selected ? "border-accent bg-accent/12 text-text" : "border-border bg-surface text-muted",
                disabled && "opacity-50",
              )}
            >
              <span className={cn("font-mono text-[11px]", selected ? "text-accent" : "text-subtle")}>
                {index + 1}
              </span>
              {choiceLabel(field, option)}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[11px] text-subtle">
        1 to {options.length} to answer. Arrow keys to move. Or type it below.
      </p>
    </div>
  );
}
