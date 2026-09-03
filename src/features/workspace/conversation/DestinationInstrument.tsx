"use client";

import { motion, useReducedMotion } from "motion/react";
import type { CandidateDestination } from "@/src/ai/graph/state";
import { plateMotifFor } from "@/data/travel/catalog";
import { MotifBand } from "@/src/features/workspace/conversation/MotifBand";
import { plateClimate } from "@/src/features/workspace/conversation/plates";
import { useListKeys } from "@/src/features/workspace/conversation/useListKeys";
import { cn } from "@/src/lib/cn";

export function DestinationInstrument({
  title,
  prompt,
  candidates,
  recommendedSlug,
  disabled,
  onChoose,
}: {
  title: string;
  prompt: string;
  candidates: CandidateDestination[];
  recommendedSlug?: string;
  disabled?: boolean;
  onChoose: (slug: string) => void;
}) {
  const recommended = Math.max(
    0,
    candidates.findIndex((candidate) => candidate.slug === recommendedSlug),
  );
  const reduce = useReducedMotion();
  const { active, setActive } = useListKeys({
    count: candidates.length,
    initialActive: recommended === -1 ? 0 : recommended,
    disabled,
    enableDigits: true,
    onConfirm: (index) => {
      const next = candidates[index];
      if (next) onChoose(next.slug);
    },
  });

  return (
    <div role="listbox" aria-label={title} tabIndex={0} className="outline-none">
      <h2 className="font-mono text-[12px] text-subtle">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{prompt}</p>
      <ol className="mt-3 flex flex-col gap-2">
        {candidates.map((candidate, index) => {
          const selected = active === index;
          const climate = plateClimate(candidate.slug);
          const motif = plateMotifFor(candidate.slug);
          return (
            <motion.li
              key={candidate.slug}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onMouseEnter={() => setActive(index)}
                onClick={() => onChoose(candidate.slug)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-[10px] border px-2 py-1.5 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  selected ? "border-accent bg-elevated" : "border-border bg-surface",
                  disabled && "opacity-50",
                )}
              >
                <span className={cn("w-4 shrink-0 text-center font-mono text-[11px]", selected ? "text-accent" : "text-subtle")}>
                  {index + 1}
                </span>
                <MotifBand motif={motif} className="h-10 w-10 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-display text-[15px] font-semibold leading-5 tracking-tight">
                      {candidate.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                        candidate.fit === "strong" && "bg-accent text-ink",
                        candidate.fit === "good" && "border border-border text-muted",
                        candidate.fit === "possible" && "text-subtle",
                      )}
                    >
                      {candidate.fit}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] text-subtle">
                    {[candidate.country, climate, candidate.slug === recommendedSlug ? "Recommended" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>
      <p className="mt-2 font-mono text-[11px] text-subtle">
        1 to {candidates.length} to choose. Arrow keys to move. Or type the name below.
      </p>
    </div>
  );
}
