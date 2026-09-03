"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { inferStopKind } from "@/src/ai/graph/itinerary";
import type { Itinerary } from "@/src/ai/graph/state";
import { plateMotifFor } from "@/data/travel/catalog";
import { MotifBand } from "@/src/features/workspace/conversation/MotifBand";
import { plateCoords } from "@/src/features/workspace/conversation/plates";

export function FolioInstrument({ itinerary }: { itinerary: Itinerary }) {
  const reduce = useReducedMotion();
  const [openDay, setOpenDay] = useState(0);
  const constraint = itinerary.constraintsHonored[0];
  const coords = plateCoords(itinerary.destinationSlug);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[10px] border border-border bg-elevated"
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <MotifBand motif={plateMotifFor(itinerary.destinationSlug)} className="h-10 w-10 shrink-0" />
        <div className="min-w-0">
          <h2 className="truncate font-display text-[1.1rem] font-semibold leading-6 tracking-tight text-text">
            {itinerary.destinationName}
          </h2>
          <p className="font-mono text-[11px] text-subtle">
            {itinerary.days.length} days
            {constraint ? ` · ${constraint}` : ""}
            {coords ? ` · ${coords}` : ""}
          </p>
        </div>
      </div>
      <ol>
        {itinerary.days.map((day) => {
          const open = openDay === day.day;
          return (
            <li key={day.day} className="border-t border-border">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenDay(open ? 0 : day.day)}
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-surface/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
              >
                <span className="shrink-0 font-mono text-[11px] text-accent">Day {day.day}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">{day.title}</span>
                {open ? <CaretUp weight="light" size={14} /> : <CaretDown weight="light" size={14} />}
              </button>
              {open && (
                <ul className="px-3 pb-3">
                  {day.stops.map((stop) => (
                    <li key={stop.title} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-1 text-sm">
                      <span className="font-mono text-[11px] text-accent">
                        {stop.kind ?? inferStopKind(stop.title, stop.notes)}
                      </span>
                      <span>
                        <span className="text-text">{stop.title}</span>
                        {stop.notes ? <span className="mt-0.5 block text-sm text-muted">{stop.notes}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}
