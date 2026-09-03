"use client";

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
      <h2 className="font-display text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-text">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{prompt}</p>
      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {candidates.map((candidate, index) => {
          const selected = active === index;
          const coords = plateCoords(candidate.slug);
          const climate = plateClimate(candidate.slug);
          const motif = plateMotifFor(candidate.slug);
          const tag = candidate.factors[0];
          return (
            <li key={candidate.slug}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onMouseEnter={() => setActive(index)}
                onClick={() => onChoose(candidate.slug)}
                className={cn(
                  "flex min-h-11 w-full flex-col rounded-[14px] border p-1.5 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  selected ? "border-accent bg-elevated shadow-[0_18px_50px_oklch(0.12_0.03_265/0.45)]" : "border-border bg-surface",
                  disabled && "opacity-50",
                )}
              >
                <MotifBand motif={motif} className="h-[5.25rem]" />
                <span className="rounded-[10px] px-4 py-4">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] text-accent">{index + 1}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                        candidate.fit === "strong" && "bg-accent text-ink",
                        candidate.fit === "good" && "border border-border text-muted",
                        candidate.fit === "possible" && "text-subtle",
                      )}
                    >
                      {candidate.fit}
                    </span>
                  </span>
                  <span className="mt-3 block font-display text-xl font-semibold leading-[1.15] tracking-tight">
                    {candidate.name}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{candidate.country}</span>
                  {coords && <span className="mt-2 block font-mono text-[11px] text-subtle">{coords}</span>}
                  <span className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    {tag && <span>{tag}</span>}
                    <span>{climate}</span>
                  </span>
                  <span className={cn("mt-3 block text-sm leading-6", selected ? "text-text" : "text-muted")}>
                    {candidate.summary}
                  </span>
                  {candidate.slug === recommendedSlug && (
                    <span className="mt-3 block text-sm text-accent">Recommended</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 font-mono text-[11px] text-subtle">
        1 to {candidates.length} to choose. Arrow keys to move. Or type the name below.
      </p>
    </div>
  );
}
