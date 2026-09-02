"use client";

import { Buildings, SquaresFour, UsersThree, Waves } from "@phosphor-icons/react";
import { MotifPlate } from "@/src/features/workspace/studio/MotifPlate";
import { TRIP_TYPE_MOTIFS } from "@/src/features/workspace/studio/trip-copy";
import type { PlateMotif } from "@/data/travel/catalog";
import { cn } from "@/src/lib/cn";

const TRIP_TYPE_ICONS: Record<string, typeof Waves> = {
  beach: Waves,
  city: Buildings,
  family: UsersThree,
  mix: SquaresFour,
};

function tileLabel(field: string, option: string) {
  if (field === "duration") return `${option} nights`;
  if (option === "beach") return "Beach";
  if (option === "city") return "City";
  if (option === "family") return "Family";
  if (option === "mix") return "Mix";
  return option;
}

export function GatheringPicker({
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
  const nightPicker = field === "duration";

  return (
    <section className="mx-auto w-full max-w-5xl">
      <h2 className="font-display text-3xl leading-[1.15] text-text md:text-4xl">{question}</h2>
      <div
        role="radiogroup"
        aria-label={question}
        className={cn(
          "mt-8 grid gap-3",
          nightPicker ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2",
        )}
      >
        {options.map((option) => {
          const Icon = TRIP_TYPE_ICONS[option];
          const motif: PlateMotif = TRIP_TYPE_MOTIFS[option] ?? "grid";
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked="false"
              disabled={disabled}
              onClick={() => onPick(field, option)}
              className={cn(
                "relative min-h-11 overflow-hidden rounded-[8px] border border-border bg-elevated text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                "active:scale-[0.99] disabled:opacity-50",
                nightPicker ? "min-h-[132px] px-5 py-4" : "min-h-[168px]",
              )}
            >
              {!nightPicker && <MotifPlate motif={motif} className="absolute inset-0" />}
              {!nightPicker && (
                <span className="absolute inset-0 bg-gradient-to-t from-elevated via-elevated/75 to-transparent" />
              )}
              <span className="relative flex h-full flex-col justify-end gap-2 p-5">
                {nightPicker ? (
                  <span className="font-display text-5xl leading-none text-text">{option}</span>
                ) : (
                  Icon && <Icon weight="light" size={22} className="text-accent" />
                )}
                <span className={nightPicker ? "text-sm text-muted" : "font-display text-2xl leading-[1.15]"}>
                  {tileLabel(field, option)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
