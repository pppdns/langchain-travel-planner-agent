"use client";

import { AirplaneLanding, AirplaneTakeoff, Columns, ForkKnife, PersonSimpleWalk, Waves } from "@phosphor-icons/react";
import { getDestination } from "@/data/travel/catalog";
import { inferStopKind } from "@/src/ai/graph/itinerary";
import type { Itinerary, ItineraryStopKind } from "@/src/ai/graph/state";
import { MotifPlate } from "@/src/features/workspace/studio/MotifPlate";

const STOP_ICONS: Record<ItineraryStopKind, typeof Waves> = {
  arrive: AirplaneLanding,
  swim: Waves,
  walk: PersonSimpleWalk,
  eat: ForkKnife,
  see: Columns,
  leave: AirplaneTakeoff,
};

export function DayFolio({
  itinerary,
  assembling = false,
}: {
  itinerary?: Itinerary;
  assembling?: boolean;
}) {
  const destination = itinerary ? getDestination(itinerary.destinationSlug) : undefined;
  const days = itinerary?.days ?? [];

  return (
    <div className="space-y-6">
      {itinerary && (
        <header className="overflow-hidden rounded-[8px] border border-border bg-elevated">
          <MotifPlate motif={destination?.plate.motif ?? "grid"} className="h-40 w-full md:h-52" />
          <div className="px-5 py-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">Destination</p>
            <h2 className="mt-1 font-display text-4xl leading-[1.15] text-text">{itinerary.destinationName}</h2>
            {destination && <p className="mt-2 max-w-2xl text-sm text-muted">{destination.summary}</p>}
          </div>
        </header>
      )}

      <div className="space-y-4">
        {days.map((day) => (
          <article key={day.day} className="rounded-[8px] border border-border bg-elevated px-5 py-5">
            <p className="font-display text-2xl leading-[1.15] text-text">
              Day {day.day}
            </p>
            <h3 className="mt-1 text-base text-text">{day.title}</h3>
            {day.area && <p className="mt-1 text-sm text-muted">{day.area}</p>}
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {day.stops.map((stop) => {
                const kind = stop.kind ?? inferStopKind(stop.title, stop.notes);
                const Icon = STOP_ICONS[kind];
                return (
                  <li key={stop.title} className="flex min-h-11 items-start gap-3 rounded-[8px] bg-surface px-3 py-3">
                    <Icon weight="light" size={20} className="mt-0.5 text-accent" />
                    <span>
                      <span className="block text-sm text-text">{stop.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{stop.notes}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}

        {assembling &&
          Array.from({ length: Math.max(0, 3 - days.length) }, (_, index) => (
            <div key={`assembling-${index}`} className="h-36 animate-pulse rounded-[8px] border border-border bg-elevated" />
          ))}
      </div>
    </div>
  );
}
