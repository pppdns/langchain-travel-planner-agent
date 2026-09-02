"use client";

import { STARTER_COPY, type StarterId } from "@/src/ai/contracts/http";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PublicTripState } from "@/src/ai/graph/state";
import { cn } from "@/src/lib/cn";
import type { JournalMessage } from "@/src/features/workspace/types";

const STARTER_IDS = Object.keys(STARTER_COPY) as StarterId[];

export function Journal({
  messages,
  tripState,
  events,
  running,
  onStarter,
  onChip,
  onResume,
}: {
  messages: JournalMessage[];
  tripState: PublicTripState;
  events: PublicEvent[];
  running: boolean;
  onStarter: (id: StarterId) => void;
  onChip: (field: string, value: string) => void;
  onResume: (interruptId: string, value: string) => void;
}) {
  const interrupt = tripState.pendingInterrupt
    ? [...events].reverse().find((event) => event.type === "interrupt")
    : undefined;
  const latestGraph = [...events].reverse().find((event) => event.type === "graph");

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface">
      <div className="border-b border-border px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">Journal</p>
        <h2 className="mt-1 text-lg text-text">Where should this trip begin?</h2>
        <p className="mt-1 text-sm text-muted">
          Pick a starter or answer in chips. The atlas is the live LangGraph path.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
        {STARTER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            disabled={running}
            onClick={() => onStarter(id)}
            className="min-h-11 rounded-full border border-border bg-elevated px-4 text-sm text-text transition hover:border-accent"
          >
            {STARTER_COPY[id].label}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="sr-only">
        {latestGraph && latestGraph.type === "graph" ? latestGraph.caption : ""}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            The canvas starts as an architecture blueprint. Nodes light only when the graph actually
            runs.
          </p>
        )}
        {messages.map((message) => (
          <article key={message.id} className="max-w-prose">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
              {message.role === "user" ? "You" : "Route State"}
            </p>
            <p className="mt-1 text-[15px] leading-7 text-text">{message.content}</p>
          </article>
        ))}

        {tripState.guidedOptions.length > 0 && (
          <div role="radiogroup" aria-label="Guided options" className="flex flex-wrap gap-2">
            {tripState.guidedOptions.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked="false"
                disabled={running}
                onClick={() => onChip(tripState.lastQuestion?.includes("nights") ? "duration" : "tripType", option)}
                className="min-h-11 rounded-full border border-border bg-elevated px-4 text-sm"
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {interrupt && interrupt.type === "interrupt" && (
          <div className="rounded-[8px] border border-accent/40 bg-elevated p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
              Human interrupt
            </p>
            <h3 className="mt-2 font-display text-2xl">{interrupt.title}</h3>
            <p className="mt-1 text-sm text-muted">{interrupt.prompt}</p>
            <div className="mt-4 space-y-2">
              {interrupt.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={running}
                  onClick={() => onResume(interrupt.interruptId, option.id)}
                  className={cn(
                    "flex min-h-11 w-full items-start justify-between rounded-[8px] border px-4 py-3 text-left",
                    option.recommended ? "border-accent bg-background" : "border-border bg-surface",
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium">{option.label}</span>
                    {option.description && (
                      <span className="mt-1 block text-xs text-muted">{option.description}</span>
                    )}
                  </span>
                  {option.fit && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
                      {option.fit} fit
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {tripState.itinerary && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">Itinerary</p>
            <h3 className="font-display text-3xl">{tripState.itinerary.destinationName}</h3>
            <ol className="mt-3 space-y-3">
              {tripState.itinerary.days.map((day) => (
                <li key={day.day}>
                  <p className="text-sm font-medium">
                    Day {day.day}: {day.title}
                  </p>
                  <p className="text-sm text-muted">{day.stops.map((stop) => stop.title).join(" · ")}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
