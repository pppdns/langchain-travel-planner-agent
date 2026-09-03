import type { GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";

const BEATS: Record<GraphNodeId, string[]> = {
  scope_guard: ["Checking the request", "Thinking"],
  gather_preferences: ["Reading your note", "Thinking"],
  route_supervisor: ["Choosing the next step"],
  discover_destinations: ["Searching destination knowledge", "Checking weather", "Comparing coastal fits"],
  await_destination_choice: ["Preparing choices"],
  research_local: ["Loading weather forecast", "Reading neighborhoods", "Summarizing the stay"],
  plan_itinerary: ["Drafting the days", "Balancing transfers", "Writing the plan"],
  critique_itinerary: ["Reviewing the pace", "Checking transfers"],
  await_tradeoff: ["Weighing a tradeoff"],
  present_plan: ["Writing the reply", "Summarizing"],
};

export function agentProgressLabel(
  events: PublicEvent[],
  activeNode: GraphNodeId | null,
  tick: number,
): string {
  const evidence = [...events].reverse().find((event) => event.type === "evidence");
  const title = evidence && evidence.type === "evidence" ? evidence.items.at(-1)?.title : undefined;
  if (title && /weather/i.test(title)) return "Loading weather forecast";
  if (title && tick % 3 === 1) {
    return title.length > 36 ? "Reading source notes" : `Reading ${title}`;
  }
  if (!activeNode) return tick % 2 === 0 ? "Thinking" : "Typing";
  const beats = BEATS[activeNode];
  return beats[tick % beats.length] ?? "Thinking";
}
