"use client";

import { motion, useReducedMotion } from "motion/react";
import type { CandidateDestination } from "@/src/ai/graph/state";
import { plateMotifFor } from "@/data/travel/catalog";
import { MotifBand } from "@/src/features/workspace/conversation/MotifBand";
import { plateClimate, plateCoords } from "@/src/features/workspace/conversation/plates";
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
      <h2 className="font-display text-[1.5rem] font-semibold leading-[1.15] tracking-tight text-text">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{prompt}</p>
      <ol className="mt-4 flex flex-col gap-2">
        {candidates.map((candidate, index) => {
          const selected = active === index;
          const coords = plateCoords(candidate.slug);
          const climate = plateClimate(candidate.slug);
          const motif = plateMotifFor(candidate.slug);
          const tag = candidate.factors[0];
          return (
            <motion.li
              key={candidate.slug}
              initial={reduce ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onMouseEnter={() => setActive(index)}
                onClick={() => onChoose(candidate.slug)}
                className={cn(
                  "flex min-h-11 w-full items-stretch gap-3 rounded-[16px] border p-1.5 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  selected ? "border-accent bg-elevated" : "border-border bg-surface",
                  disabled && "opacity-50",
                )}
              >
                <MotifBand motif={motif} className="h-[4.75rem] w-[4.75rem] shrink-0" />
                <span className="min-w-0 flex-1 py-1 pr-2">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-lg font-semibold leading-[1.15] tracking-tight">
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
                  <span className="mt-1 block font-mono text-[11px] text-subtle">
                    {[candidate.country, coords, climate].filter(Boolean).join(", ")}
                  </span>
                  <span className={cn("mt-1 block text-sm leading-6", selected ? "text-text" : "text-muted")}>
                    {candidate.summary}
                    {candidate.slug === recommendedSlug ? " Recommended." : ""}
                  </span>
                  {tag && (
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{tag}</span>
                  )}
                  {candidate.evidence[0] && (
                    <span className="mt-1 block font-mono text-[10px] text-subtle">{candidate.evidence[0].title}</span>
                  )}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>
      <p className="mt-3 font-mono text-[11px] text-subtle">
        1 to {candidates.length} to choose. Arrow keys to move. Or type the name below.
      </p>
    </div>
  );
}
