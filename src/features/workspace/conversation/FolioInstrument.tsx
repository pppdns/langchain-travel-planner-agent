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
  const [openDay, setOpenDay] = useState(1);
  const constraint = itinerary.constraintsHonored[0];
  const coords = plateCoords(itinerary.destinationSlug);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[14px] border border-border bg-surface p-1.5"
    >
      <div className="overflow-hidden rounded-[10px] bg-elevated">
        <MotifBand motif={plateMotifFor(itinerary.destinationSlug)} className="h-20 rounded-none" />
        <div className="px-5 py-5">
          <p className="font-mono text-[12px] text-subtle">
            {itinerary.days.length} days
            {constraint ? `. ${constraint}` : ""}
          </p>
          <h2 className="mt-1 font-display text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-text">
            {itinerary.destinationName}
          </h2>
          {coords && <p className="mt-2 font-mono text-[11px] text-subtle">{coords}</p>}
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
                  className="flex min-h-11 w-full items-baseline justify-between gap-4 px-5 py-4 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-surface/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                >
                  <span>
                    <span className="font-display text-lg font-semibold leading-[1.15]">Day {day.day}</span>
                    <span className="mt-1 block text-sm text-muted">{day.title}</span>
                  </span>
                  {open ? <CaretUp weight="light" size={16} /> : <CaretDown weight="light" size={16} />}
                </button>
                {open && (
                  <ul className="px-5 pb-5">
                    {day.stops.map((stop) => (
                      <li key={stop.title} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2 text-sm">
                        <span className="font-mono text-[11px] text-accent">
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
    </motion.div>
  );
}
