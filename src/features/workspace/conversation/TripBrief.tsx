"use client";

import type { PublicTripState } from "@/src/ai/graph/state";

const STAGE_LABEL: Record<PublicTripState["currentPlanningStage"], string> = {
  intake: "Intake",
  gathering: "Gathering",
  discovering: "Discovering",
  awaiting_destination: "Waiting on a destination",
  researching: "Researching",
  planning: "Planning",
  awaiting_tradeoff: "Waiting on a tradeoff",
  presenting: "Presenting",
  complete: "Complete",
};

function partyLabel(trip: PublicTripState) {
  const adults = trip.travelers.adults;
  const children = trip.travelers.children;
  if (children > 0) return `${adults + children} travelers, ${children} child${children === 1 ? "" : "ren"}`;
  return `${adults} adult${adults === 1 ? "" : "s"}`;
}

export function TripBrief({
  tripState,
  compact,
  onForget,
}: {
  tripState: PublicTripState;
  compact?: boolean;
  onForget?: (key: string) => void;
}) {
  const nights = tripState.dates.durationNights;
  const destination = tripState.destinationName ?? "Not chosen";
  const budget =
    tripState.budget.amount !== undefined
      ? `${tripState.budget.amount} ${tripState.budget.currency}${tripState.budget.flexibility === "strict" ? ", strict" : ""}`
      : "Open";
  const photo = tripState.visionObservations?.at(-1);
  const remembered = tripState.rememberedPreferences ?? [];

  if (compact) {
    return (
      <p className="truncate font-mono text-[11px] text-subtle">
        {destination}
        {nights ? ` · ${nights} nights` : ""}
        {` · ${STAGE_LABEL[tripState.currentPlanningStage]}`}
      </p>
    );
  }

  return (
    <section aria-label="Trip state" className="border-t border-border px-4 py-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">Trip</p>
      <dl className="mt-2 grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-subtle">Place</dt>
          <dd className="text-right text-text">{destination}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-subtle">Party</dt>
          <dd className="text-right text-text">{partyLabel(tripState)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-subtle">Nights</dt>
          <dd className="text-right text-text">{nights ?? "Open"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-subtle">Budget</dt>
          <dd className="text-right text-text">{budget}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-subtle">Stage</dt>
          <dd className="text-right text-text">{STAGE_LABEL[tripState.currentPlanningStage]}</dd>
        </div>
        {photo && (
          <div>
            <dt className="text-subtle">Photo note</dt>
            <dd className="mt-1 text-muted">{photo.atmosphere}</dd>
          </div>
        )}
        {remembered.length > 0 && (
          <div>
            <dt className="text-subtle">Remembered</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {remembered.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1 font-mono text-[11px] text-muted"
                >
                  {item.key} · {item.value}
                  {onForget && (
                    <button
                      type="button"
                      onClick={() => onForget(item.key)}
                      className="text-subtle transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      Forget
                    </button>
                  )}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
