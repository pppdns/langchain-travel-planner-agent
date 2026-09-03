"use client";

import type { PublicEvent } from "@/src/ai/stream/public-events";

export function evidenceTitles(events: PublicEvent[]) {
  const titles = events
    .filter((event) => event.type === "evidence")
    .flatMap((event) => event.items.map((item) => item.title));
  return [...new Set(titles)];
}

export function EvidenceStrip({ events }: { events: PublicEvent[] }) {
  const titles = evidenceTitles(events);
  if (!titles.length) return null;
  return (
    <p className="font-mono text-[11px] leading-5 text-subtle">
      Used {titles.length} source{titles.length === 1 ? "" : "s"} · {titles.slice(0, 4).join(" · ")}
    </p>
  );
}
