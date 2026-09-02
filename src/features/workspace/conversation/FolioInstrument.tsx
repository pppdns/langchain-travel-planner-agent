"use client";

import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { inferStopKind } from "@/src/ai/graph/itinerary";
import type { Itinerary } from "@/src/ai/graph/state";

export function FolioInstrument({ itinerary }: { itinerary: Itinerary }) {
  const [openDay, setOpenDay] = useState(1);
  const constraint = itinerary.constraintsHonored[0];

  return (
    <div>
      <p className="font-mono text-[12px] text-subtle">
        {itinerary.days.length} days
        {constraint ? `. ${constraint}` : ""}
      </p>
      <h2 className="mt-1 font-display text-3xl leading-[1.15] text-text">{itinerary.destinationName}</h2>
      <ol className="mt-5">
        {itinerary.days.map((day) => {
          const open = openDay === day.day;
          return (
            <li key={day.day} className="border-t border-border last:border-b">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenDay(open ? 0 : day.day)}
                className="flex min-h-11 w-full items-baseline justify-between gap-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span>
                  <span className="font-display text-xl leading-[1.15]">Day {day.day}</span>
                  <span className="mt-1 block text-sm text-text">{day.title}</span>
                </span>
                {open ? <CaretUp weight="light" size={16} /> : <CaretDown weight="light" size={16} />}
              </button>
              {open && (
                <ul className="pb-4">
                  {day.stops.map((stop) => (
                    <li key={stop.title} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2 text-sm">
                      <span className="font-mono text-[11px] text-subtle">
                        {stop.kind ?? inferStopKind(stop.title, stop.notes)}
                      </span>
                      <span>
                        <span className="text-text">{stop.title}</span>
                        <span className="mt-0.5 block text-muted">{stop.notes}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
