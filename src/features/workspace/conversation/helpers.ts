import type { PendingInterrupt, PublicTripState } from "@/src/ai/graph/state";
import type { PublicEvent } from "@/src/ai/stream/public-events";

const LIVE_INTERRUPT_STAGES = new Set(["awaiting_destination", "awaiting_tradeoff"]);

export function isOffScopeQuestion(question?: string) {
  return Boolean(question && /only plan trips/i.test(question));
}

export function chipFieldForQuestion(question?: string): string {
  const haystack = question?.toLowerCase() ?? "";
  if (
    haystack.includes("draft") ||
    haystack.includes("search for places") ||
    haystack.includes("find destinations") ||
    haystack.includes("show the plan") ||
    haystack.includes("adjust the days")
  ) {
    return "continue";
  }
  if (haystack.includes("night")) return "duration";
  if (haystack.includes("pace")) return "pace";
  if (haystack.includes("budget")) return "budget";
  if (haystack.includes("origin") || haystack.includes("where from")) return "origin";
  if (haystack.includes("kind of trip") || haystack.includes("trying to make")) return "tripType";
  return "preference";
}

export function interruptFromEvents(events: PublicEvent[]): PendingInterrupt | null {
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

export function resolveInterrupt(trip: PublicTripState, events: PublicEvent[]): PendingInterrupt | null {
  if (trip.pendingInterrupt) return trip.pendingInterrupt;
  if (!LIVE_INTERRUPT_STAGES.has(trip.currentPlanningStage)) return null;
  return interruptFromEvents(events);
}

export function choiceLabel(field: string, value: string) {
  if (field === "duration") return `${value} nights`;
  return value;
}

export function matchGuidedReply(text: string, options: string[], field: string): string | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return null;
  const exact = options.find(
    (option) => option.toLowerCase() === trimmed || choiceLabel(field, option).toLowerCase() === trimmed,
  );
  if (exact) return exact;
  const numbered = Number.parseInt(trimmed, 10);
  if (String(numbered) === trimmed && numbered >= 1 && numbered <= options.length) {
    return options[numbered - 1] ?? null;
  }
  if (trimmed.length < 3) return null;
  return (
    options.find(
      (option) => option.toLowerCase().includes(trimmed) || choiceLabel(field, option).toLowerCase().includes(trimmed),
    ) ?? null
  );
}

export function matchInterruptReply(
  text: string,
  interrupt: PendingInterrupt,
  candidates: { slug: string; name: string }[] = [],
): string | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return null;
  const pool = [
    ...interrupt.options.map((option) => ({ id: option.id, labels: [option.id, option.label] })),
    ...candidates.map((candidate) => ({ id: candidate.slug, labels: [candidate.slug, candidate.name] })),
  ];
  const exact = pool.find((item) => item.labels.some((label) => label.toLowerCase() === trimmed));
  if (exact) return exact.id;
  const numbered = Number.parseInt(trimmed, 10);
  if (String(numbered) === trimmed && numbered >= 1 && numbered <= interrupt.options.length) {
    return interrupt.options[numbered - 1]?.id ?? null;
  }
  if (trimmed.length < 3) return null;
  const partial = pool.find((item) => item.labels.some((label) => label.toLowerCase().includes(trimmed)));
  return partial?.id ?? null;
}
