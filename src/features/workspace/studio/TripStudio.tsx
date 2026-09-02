"use client";

import { useState } from "react";
import { STARTER_COPY, type StarterId } from "@/src/ai/contracts/http";
import { getDestination } from "@/data/travel/catalog";
import type { PendingInterrupt, PublicTripState } from "@/src/ai/graph/state";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { DayFolio } from "@/src/features/workspace/studio/DayFolio";
import { DestinationCard, DestinationCardSkeleton } from "@/src/features/workspace/studio/DestinationCard";
import { GatheringPicker } from "@/src/features/workspace/studio/GatheringPicker";
import { MotifPlate } from "@/src/features/workspace/studio/MotifPlate";
import { ReviseDrawer } from "@/src/features/workspace/studio/ReviseDrawer";
import { StarterPlate } from "@/src/features/workspace/studio/StarterPlate";
import { chipFieldForQuestion, resolveStudioStage } from "@/src/features/workspace/studio/studio-stage";

const STARTER_IDS = Object.keys(STARTER_COPY) as StarterId[];

function StarterGrid({
  disabled,
  onStarter,
}: {
  disabled?: boolean;
  onStarter: (id: StarterId) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {STARTER_IDS.map((id, index) => (
        <StarterPlate key={id} id={id} featured={index === 0} disabled={disabled} onSelect={onStarter} />
      ))}
    </div>
  );
}

function IntakeComposer({
  disabled,
  onMessage,
}: {
  disabled?: boolean;
  onMessage: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <form
      className="mt-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        const text = draft.trim();
        setDraft("");
        onMessage(text);
      }}
    >
      <label htmlFor="trip-describe" className="text-sm text-muted">
        Describe the trip
      </label>
      <div className="mt-2 flex items-end gap-3">
        <textarea
          id="trip-describe"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          placeholder="A city break in June, or a family beach week."
          className="min-h-11 flex-1 resize-none rounded-[8px] border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          className="min-h-11 rounded-[8px] bg-accent px-4 text-sm text-elevated disabled:opacity-50"
        >
          Start
        </button>
      </div>
    </form>
  );
}

function interruptFromEvents(events: PublicEvent[]): PendingInterrupt | null {
  const latest = [...events].reverse().find((event) => event.type === "interrupt");
  if (!latest || latest.type !== "interrupt") return null;
  return {
    interruptId: latest.interruptId,
    interruptType: latest.interruptType,
    title: latest.title,
    prompt: latest.prompt,
    options: latest.options,
  };
}

export function TripStudio({
  tripState,
  events,
  running,
  lastAssistantText,
  onStarter,
  onChip,
  onResume,
  onMessage,
}: {
  tripState: PublicTripState;
  events: PublicEvent[];
  running: boolean;
  lastAssistantText: string;
  onStarter: (id: StarterId) => void;
  onChip: (field: string, value: string) => void;
  onResume: (interruptId: string, value: string) => void;
  onMessage: (text: string) => void;
}) {
  const stage = resolveStudioStage(tripState, running);
  const interrupt = tripState.pendingInterrupt ?? interruptFromEvents(events);
  const recommendedSlug =
    interrupt?.options.find((option) => option.recommended)?.id ?? tripState.candidateDestinations[0]?.slug;
  const destination = tripState.destinationSlug ? getDestination(tripState.destinationSlug) : undefined;
  const redirectCopy =
    lastAssistantText ||
    tripState.lastQuestion ||
    "I only plan trips here. Share a destination, a vibe, or pick a starter.";

  return (
    <section id="studio" data-studio-stage={stage} className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
      {stage === "intake" && (
        <>
          <h1 className="font-display text-4xl leading-[1.15] text-text md:text-5xl">
            Where should this trip begin?
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            Pick a plate. The rail shows the live LangGraph path while the plan assembles.
          </p>
          <div className="mt-8">
            <StarterGrid disabled={running} onStarter={onStarter} />
          </div>
          <IntakeComposer disabled={running} onMessage={onMessage} />
        </>
      )}

      {stage === "off_scope" && (
        <>
          <div className="rounded-[8px] border border-accent/40 bg-elevated px-5 py-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">Stay on the trip</p>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-text">{redirectCopy}</p>
          </div>
          <h2 className="mt-8 font-display text-3xl leading-[1.15] text-text">Where should this trip begin?</h2>
          <div className="mt-6">
            <StarterGrid disabled={running} onStarter={onStarter} />
          </div>
        </>
      )}

      {stage === "gathering" && (
        <GatheringPicker
          question={tripState.lastQuestion ?? "What kind of trip are you trying to make?"}
          options={tripState.guidedOptions}
          field={chipFieldForQuestion(tripState.lastQuestion)}
          disabled={running}
          onPick={onChip}
        />
      )}

      {stage === "discovering" && (
        <>
          <h2 className="font-display text-3xl leading-[1.15] text-text">Looking for places that fit</h2>
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
            <DestinationCardSkeleton featured />
            <DestinationCardSkeleton />
            <DestinationCardSkeleton />
          </div>
        </>
      )}

      {stage === "awaiting_destination" && (
        <>
          <h2 className="font-display text-3xl leading-[1.15] text-text md:text-4xl">Choose a destination</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            {interrupt?.prompt ?? "These places fit the trip so far. Pick one and the same thread continues."}
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
            {tripState.candidateDestinations.map((candidate) => (
              <DestinationCard
                key={candidate.slug}
                candidate={candidate}
                recommended={candidate.slug === recommendedSlug}
                featured={candidate.slug === recommendedSlug}
                disabled={running}
                onChoose={(slug) => {
                  if (!interrupt) return;
                  onResume(interrupt.interruptId, slug);
                }}
              />
            ))}
          </div>
        </>
      )}

      {stage === "planning" && (
        <>
          {tripState.destinationName && (
            <header className="mb-6 overflow-hidden rounded-[8px] border border-border bg-elevated">
              <MotifPlate motif={destination?.plate.motif ?? "grid"} className="h-40 w-full" />
              <div className="px-5 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">Assembling</p>
                <h2 className="mt-1 font-display text-4xl leading-[1.15] text-text">{tripState.destinationName}</h2>
              </div>
            </header>
          )}
          <DayFolio itinerary={tripState.itinerary} assembling />
        </>
      )}

      {stage === "awaiting_tradeoff" && interrupt && (
        <>
          <h2 className="font-display text-3xl leading-[1.15] text-text">{interrupt.title}</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">{interrupt.prompt}</p>
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
            {interrupt.options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={running}
                onClick={() => onResume(interrupt.interruptId, option.id)}
                className="min-h-11 rounded-[8px] border border-border bg-elevated px-5 py-5 text-left hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              >
                <span className="block font-display text-2xl leading-[1.15]">{option.label}</span>
                {option.description && <span className="mt-2 block text-sm text-muted">{option.description}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {stage === "complete" && tripState.itinerary && (
        <>
          <DayFolio itinerary={tripState.itinerary} />
          <ReviseDrawer disabled={running} onRevise={onMessage} />
        </>
      )}
    </section>
  );
}
