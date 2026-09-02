"use client";

import { STARTER_COPY, type StarterId } from "@/src/ai/contracts/http";
import { MotifPlate } from "@/src/features/workspace/studio/MotifPlate";
import { STARTER_MOTIFS } from "@/src/features/workspace/studio/trip-copy";
import { cn } from "@/src/lib/cn";

export function StarterPlate({
  id,
  featured = false,
  disabled,
  onSelect,
}: {
  id: StarterId;
  featured?: boolean;
  disabled?: boolean;
  onSelect: (id: StarterId) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(id)}
      data-starter={id}
      className={cn(
        "group relative min-h-11 overflow-hidden rounded-[8px] border border-border bg-elevated text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "active:scale-[0.99] disabled:opacity-50",
        featured ? "min-h-[220px] md:col-span-2" : "min-h-[168px]",
      )}
    >
      <MotifPlate motif={STARTER_MOTIFS[id]} className="absolute inset-0" />
      <span className="absolute inset-0 bg-gradient-to-t from-elevated via-elevated/70 to-elevated/10" />
      <span className="relative flex h-full flex-col justify-end p-5">
        <span className="font-display text-2xl leading-[1.15] text-text md:text-[1.7rem]">
          {STARTER_COPY[id].label}
        </span>
      </span>
    </button>
  );
}
