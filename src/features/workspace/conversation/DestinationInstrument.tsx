"use client";

import type { CandidateDestination } from "@/src/ai/graph/state";
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
      <h2 className="font-display text-3xl leading-[1.15] text-text">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{prompt}</p>
      <ol className="mt-5">
        {candidates.map((candidate, index) => {
          const selected = active === index;
          const evidence = candidate.evidence[0];
          return (
            <li key={candidate.slug} className="border-t border-border last:border-b">
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onMouseEnter={() => setActive(index)}
                onClick={() => onChoose(candidate.slug)}
                className={cn(
                  "grid min-h-11 w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-4 py-4 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  selected ? "bg-surface/90" : "bg-transparent",
                  disabled && "opacity-50",
                )}
              >
                <span className="font-display text-2xl leading-[1.15] text-accent">{index + 1}</span>
                <span>
                  <span className="block font-display text-2xl leading-[1.15]">{candidate.name}</span>
                  <span className="mt-1 block text-sm text-muted">{candidate.country}</span>
                  {selected && (
                    <>
                      <span className="mt-2 block text-sm leading-6 text-text">{candidate.summary}</span>
                      {candidate.factors.length > 0 && (
                        <span className="mt-2 block text-sm text-muted">{candidate.factors.join(", ")}</span>
                      )}
                      {evidence && (
                        <span className="mt-2 block font-mono text-[11px] text-subtle">{evidence.title}</span>
                      )}
                    </>
                  )}
                </span>
                <span className="pt-1 text-right text-sm text-muted">
                  {candidate.fit}
                  {candidate.slug === recommendedSlug ? (
                    <span className="mt-1 block text-accent">Recommended</span>
                  ) : null}
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
