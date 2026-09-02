"use client";

import {
  Buildings,
  Coins,
  Columns,
  ForkKnife,
  Moon,
  Mountains,
  PersonSimpleWalk,
  Sun,
  Taxi,
  UsersThree,
  Waves,
} from "@phosphor-icons/react";
import { getDestination, type DestinationTraits } from "@/data/travel/catalog";
import type { CandidateDestination } from "@/src/ai/graph/state";
import { MotifPlate } from "@/src/features/workspace/studio/MotifPlate";
import { cn } from "@/src/lib/cn";

const TRAIT_MARKS: Array<{
  key: keyof DestinationTraits;
  label: string;
  Icon: typeof Waves;
}> = [
  { key: "beach", label: "Beach", Icon: Waves },
  { key: "city", label: "City", Icon: Buildings },
  { key: "family", label: "Family", Icon: UsersThree },
  { key: "food", label: "Food", Icon: ForkKnife },
  { key: "culture", label: "Culture", Icon: Columns },
  { key: "nature", label: "Nature", Icon: Mountains },
  { key: "warm", label: "Warm", Icon: Sun },
  { key: "walkable", label: "Walkable", Icon: PersonSimpleWalk },
  { key: "shortTransfers", label: "Short hops", Icon: Taxi },
  { key: "budgetFriendly", label: "Careful budget", Icon: Coins },
  { key: "nightlife", label: "Evenings", Icon: Moon },
];

export function DestinationCard({
  candidate,
  recommended,
  featured = false,
  disabled,
  onChoose,
}: {
  candidate: CandidateDestination;
  recommended?: boolean;
  featured?: boolean;
  disabled?: boolean;
  onChoose: (slug: string) => void;
}) {
  const catalog = getDestination(candidate.slug);
  const traits = TRAIT_MARKS.filter((trait) => catalog?.traits[trait.key]).slice(0, 4);
  const evidence = candidate.evidence.slice(0, 2);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChoose(candidate.slug)}
      data-destination={candidate.slug}
      className={cn(
        "group flex min-h-11 flex-col overflow-hidden rounded-[8px] border bg-elevated text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "active:scale-[0.99] disabled:opacity-50",
        recommended ? "border-accent" : "border-border",
        featured && "md:col-span-2 md:flex-row",
      )}
    >
      <MotifPlate
        motif={catalog?.plate.motif ?? "grid"}
        className={cn("h-36 w-full", featured && "md:h-auto md:w-[42%]")}
      />
      <span className="flex flex-1 flex-col gap-3 p-5">
        <span className="flex items-start justify-between gap-3">
          <span>
            <span className="block font-display text-3xl leading-[1.15] text-text">{candidate.name}</span>
            <span className="mt-1 block text-sm text-muted">{candidate.country}</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
            {candidate.fit} fit
          </span>
        </span>
        {traits.length > 0 && (
          <span className="flex flex-wrap gap-3 text-muted">
            {traits.map(({ key, label, Icon }) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-xs">
                <Icon weight="light" size={16} />
                {label}
              </span>
            ))}
          </span>
        )}
        {evidence.length > 0 && (
          <span className="space-y-1">
            {evidence.map((item) => (
              <span key={item.id} className="block font-mono text-[11px] text-subtle">
                {item.title}
              </span>
            ))}
          </span>
        )}
        {recommended && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Recommended</span>
        )}
      </span>
    </button>
  );
}

export function DestinationCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[8px] border border-border bg-elevated",
        featured && "md:col-span-2 md:flex md:flex-row",
      )}
    >
      <div className={cn("h-36 animate-pulse bg-map-water", featured && "md:h-auto md:w-[42%]")} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-8 w-2/3 animate-pulse rounded-[4px] bg-surface" />
        <div className="h-4 w-1/3 animate-pulse rounded-[4px] bg-surface" />
        <div className="h-4 w-1/2 animate-pulse rounded-[4px] bg-surface" />
      </div>
    </div>
  );
}
