import { getGraphNode, type GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";

export type AgentProcessStatus = "done" | "active" | "waiting";

export type AgentProcessStep = {
  node: GraphNodeId;
  label: string;
  caption: string;
  status: AgentProcessStatus;
  notes: string[];
};

export type AgentProcess = {
  steps: AgentProcessStep[];
};

function addNote(step: AgentProcessStep, note: string) {
  if (!note || step.notes.includes(note) || step.notes.length >= 2) return;
  step.notes.push(note);
}

export function buildAgentProcess(events: PublicEvent[]): AgentProcess {
  const steps: AgentProcessStep[] = [];
  let current: AgentProcessStep | undefined;

  for (const event of events) {
    if (event.type === "graph") {
      let step = steps.find((item) => item.node === event.node);
      if (!step) {
        step = {
          node: event.node,
          label: getGraphNode(event.node).label,
          caption: event.caption,
          status: event.phase === "waiting" ? "waiting" : event.phase === "end" ? "done" : "active",
          notes: [],
        };
        steps.push(step);
      } else {
        step.caption = event.caption;
        if (event.phase === "waiting") step.status = "waiting";
        else if (event.phase === "end" || event.phase === "error") step.status = "done";
        else if (event.phase === "start" && step.status === "done") step.status = "active";
      }
      current = step;
      continue;
    }

    if (!current) continue;

    if (event.type === "evidence") {
      for (const item of event.items) addNote(current, item.title);
    }
    if (event.type === "interrupt") {
      addNote(current, event.title);
    }
  }

  return { steps };
}

export function processHeadline(nodeLabel: string | undefined, label: string) {
  return nodeLabel ? `${nodeLabel} · ${label}` : label;
}
