"use client";

import { GRAPH_NODES, type GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { latestGraphCaption, statusFor } from "@/src/features/workspace/atlas/node-status";
import { cn } from "@/src/lib/cn";

export function ExecutionRail({
  events,
  activeNode,
  onOpenNode,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  onOpenNode: (id: GraphNodeId) => void;
}) {
  const caption = latestGraphCaption(events);

  return (
    <section
      aria-label="Graph execution"
      className="flex h-[120px] flex-col justify-center border-b border-border bg-surface px-4 lg:h-[72px] lg:flex-row lg:items-center lg:gap-6"
    >
      <ol className="flex min-w-0 items-center gap-0 overflow-x-auto">
        {GRAPH_NODES.map((node, index) => {
          const status = statusFor(node.id, events, activeNode);
          const previous = GRAPH_NODES[index - 1];
          const previousTouched = previous ? statusFor(previous.id, events, activeNode) !== "idle" : false;
          const committed = previousTouched && status !== "idle";

          return (
            <li key={node.id} className="flex items-center">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn("h-px w-3 shrink-0 md:w-5", committed ? "bg-accent" : "bg-map-line")}
                />
              )}
              <button
                type="button"
                onClick={() => onOpenNode(node.id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-[8px] px-2 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      status === "idle" && "bg-map-line",
                      status === "active" && "bg-accent",
                      status === "waiting" && "bg-accent",
                      status === "done" && "bg-info",
                    )}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{node.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 truncate font-mono text-[11px] text-muted lg:mt-0 lg:max-w-sm lg:text-right">{caption}</p>
    </section>
  );
}
