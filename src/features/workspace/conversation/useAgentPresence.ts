"use client";

import { useEffect, useState } from "react";
import type { GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { agentProgressLabel } from "@/src/features/workspace/conversation/agent-progress";

const MIN_HOLD_MS = 760;
const TICK_MS = 400;

export function useAgentPresence({
  running,
  events,
  activeNode,
  reduce,
}: {
  running: boolean;
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  reduce: boolean | null;
}) {
  const [session, setSession] = useState(0);
  const [minElapsed, setMinElapsed] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => {
      setSession((value) => value + 1);
      setMinElapsed(false);
      setTick(0);
    }, 0);
    return () => window.clearTimeout(id);
  }, [running]);

  useEffect(() => {
    if (minElapsed) return;
    const hold = window.setTimeout(() => setMinElapsed(true), reduce ? 0 : MIN_HOLD_MS);
    const ticks = window.setInterval(() => setTick((value) => value + 1), TICK_MS);
    return () => {
      window.clearTimeout(hold);
      window.clearInterval(ticks);
    };
  }, [minElapsed, reduce, session]);

  const busy = running || !minElapsed;
  return {
    busy,
    label: busy ? agentProgressLabel(events, activeNode, tick) : "",
    reveal: !busy,
  };
}
