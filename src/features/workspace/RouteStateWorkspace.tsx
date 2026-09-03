"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { emptyTripState, publicTripStateSchema, type PublicTripState } from "@/src/ai/graph/state";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { STARTER_COPY, type StarterId } from "@/src/ai/contracts/http";
import { getDestination } from "@/data/travel/catalog";
import { AtlasCompanion, AtlasPeek } from "@/src/features/workspace/conversation/AtlasCompanion";
import { Conversation } from "@/src/features/workspace/conversation/Conversation";
import { GraphPulse } from "@/src/features/workspace/conversation/GraphPulse";
import { TripBrief } from "@/src/features/workspace/conversation/TripBrief";
import { buildAgentProcess } from "@/src/features/workspace/conversation/agent-process";
import { useAgentPresence } from "@/src/features/workspace/conversation/useAgentPresence";
import {
  chipFieldForQuestion,
  matchGuidedReply,
  matchInterruptReply,
  resolveInterrupt,
} from "@/src/features/workspace/conversation/helpers";
import { latestGraphCaption } from "@/src/features/workspace/atlas/node-status";
import type { WorkspaceState } from "@/src/features/workspace/types";

async function readNdjson(response: Response, onFrame: (frame: { text?: string; event?: PublicEvent }) => void) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      onFrame(JSON.parse(line) as { text?: string; event?: PublicEvent });
    }
  }
}

export function RouteStateWorkspace({ initialReplay }: { initialReplay?: StarterId }) {
  const [state, setState] = useState<WorkspaceState>({
    tripId: null,
    mode: "fake",
    uploadsEnabled: true,
    tripState: emptyTripState(),
    events: [],
    messages: [],
    activeNode: null,
    selectedNode: null,
    atlasOpen: false,
    running: false,
    runEventStart: 0,
    error: null,
  });
  const [draft, setDraft] = useState("");
  const reduce = useReducedMotion();
  const runEvents = state.events.slice(state.runEventStart);
  const presence = useAgentPresence({
    running: state.running,
    events: runEvents,
    activeNode: state.activeNode,
    reduce,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const created = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await created.json()) as {
        tripId?: string;
        mode?: WorkspaceState["mode"];
        uploadsEnabled?: boolean;
        error?: string;
      };
      if (cancelled) return;
      if (!created.ok || !payload.tripId) {
        setState((current) => ({ ...current, error: payload.error ?? "Could not start a trip." }));
        return;
      }
      setState((current) => ({
        ...current,
        tripId: payload.tripId!,
        mode: payload.mode ?? "fake",
        uploadsEnabled: payload.uploadsEnabled ?? true,
      }));
      if (initialReplay) {
        await run(payload.tripId, { kind: "replay", starterId: initialReplay }, STARTER_COPY[initialReplay].label);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialReplay]);

  async function run(tripId: string, body: Record<string, unknown>, userText?: string) {
    setState((current) => ({
      ...current,
      running: true,
      runEventStart: current.events.length,
      error: null,
      messages: userText
        ? [...current.messages, { id: crypto.randomUUID(), role: "user", content: userText }]
        : current.messages,
    }));
    const response = await fetch(`/api/trips/${tripId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        ...body,
      }),
    });
    if (response.status === 409) {
      setState((current) => ({ ...current, running: false, error: "This trip is already running." }));
      return;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setState((current) => ({ ...current, running: false, error: payload.error ?? "Run failed." }));
      return;
    }

    let assistant = "";
    const streamingId = "streaming";
    await readNdjson(response, (frame) => {
      if (frame.event) {
        setState((current) => ({
          ...current,
          events: [...current.events, frame.event!],
          activeNode: frame.event!.type === "graph" ? frame.event!.node : current.activeNode,
          tripState:
            frame.event!.type === "trip-state"
              ? publicTripStateSchema.parse({ ...current.tripState, ...frame.event!.patch })
              : current.tripState,
          mode: body.kind === "replay" ? "replay" : current.mode,
        }));
      }
      if (frame.text) {
        assistant += frame.text;
        setState((current) => {
          const messages = [...current.messages];
          const last = messages.at(-1);
          if (last?.id === streamingId) {
            messages[messages.length - 1] = { ...last, content: assistant };
          } else {
            messages.push({ id: streamingId, role: "assistant", content: assistant });
          }
          return { ...current, messages };
        });
      }
    });
    setState((current) => {
      const process = buildAgentProcess(current.events.slice(current.runEventStart));
      let attached = false;
      const messages = current.messages.map((message) => {
        if (message.id !== streamingId) return message;
        attached = true;
        return {
          ...message,
          id: crypto.randomUUID(),
          process: process.steps.length ? process : message.process,
        };
      });
      if (!attached && process.steps.length) {
        messages.push({
          id: crypto.randomUUID(),
          role: "assistant",
          content: process.steps.at(-1)?.caption ?? "Planner finished this pass.",
          process,
        });
      }
      return { ...current, running: false, messages };
    });
  }

  function startRun(body: Record<string, unknown>, userText?: string) {
    if (!state.tripId) return;
    void run(state.tripId, body, userText);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-text" data-ready={state.tripId ? "true" : "false"}>
      <a
        href="#conversation"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-elevated focus:px-3 focus:py-2"
      >
        Skip to conversation
      </a>
      <header className="shrink-0 border-b border-border px-5 py-3 lg:h-16 lg:py-0">
        <div className="flex items-center justify-between gap-4 lg:h-full">
          <div className="flex min-w-0 items-baseline gap-3">
            <p className="font-display text-sm font-semibold tracking-[0.14em] text-text">ROUTE STATE</p>
            <p className="hidden font-mono text-[11px] text-subtle sm:block">Public travel planner</p>
          </div>
          <div className="hidden min-w-0 flex-1 lg:block">
            <GraphPulse
              events={state.events}
              activeNode={state.activeNode}
              running={state.running}
              progressLabel={presence.label}
              surface="desktop"
              onInspect={() => setState((current) => ({ ...current, atlasOpen: true }))}
            />
          </div>
          <nav className="flex shrink-0 items-center gap-4 text-sm">
            <span
              className="hidden font-mono text-[11px] text-subtle sm:inline"
              title={
                state.mode === "live"
                  ? "Live models are on for this session."
                  : state.mode === "replay"
                    ? "Playing a recorded public-event fixture."
                    : "Deterministic runtime so CI and the public demo stay alive."
              }
            >
              {state.mode === "live" ? "Live models" : state.mode === "replay" ? "Recorded run" : "Fake runtime"}
            </span>
            <Link href="/case-study" className="text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-text">
              Case study
            </Link>
            <a
              href="https://github.com/pppdns/agent-demo"
              className="hidden text-subtle transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-text sm:inline"
            >
              Built by Denes Papp
            </a>
          </nav>
        </div>
        <div className="mt-2 lg:hidden">
          <AtlasPeek
            events={state.events}
            activeNode={state.activeNode}
            running={state.running}
            progressLabel={presence.label}
            onOpen={() => setState((current) => ({ ...current, atlasOpen: true }))}
          />
          <div className="mt-1.5">
            <TripBrief tripState={state.tripState} compact />
          </div>
        </div>
      </header>

      {state.mode === "replay" && (
        <div className="shrink-0 border-b border-warning/30 bg-elevated px-5 py-2 text-sm text-warning">
          Recorded run. The events are the same public protocol as live planning.
        </div>
      )}
      {state.error && (
        <div className="shrink-0 border-b border-danger/30 bg-elevated px-5 py-2 text-sm text-danger">{state.error}</div>
      )}

      <div aria-live="polite" className="sr-only">
        {latestGraphCaption(state.events)}
      </div>

      <div className="flex min-h-0 flex-1">
        <Conversation
          messages={state.messages}
          tripState={state.tripState}
          events={state.events}
          runEvents={runEvents}
          activeNode={state.activeNode}
          running={state.running}
          presence={presence}
          draft={draft}
          onDraftChange={setDraft}
          onStarter={(starterId) => startRun({ kind: "starter", starterId }, STARTER_COPY[starterId].label)}
          onChip={(field, value) => startRun({ kind: "chip", field, value }, value)}
          onResume={(interruptId, value) => {
            const name = getDestination(value)?.name ?? value;
            startRun({ kind: "resume", interruptId, value }, name);
          }}
          uploadsEnabled={state.uploadsEnabled}
          onAttach={(file) => {
            if (!state.tripId) return;
            void (async () => {
              setState((current) => ({
                ...current,
                running: true,
                runEventStart: current.events.length,
                error: null,
                messages: [
                  ...current.messages,
                  { id: crypto.randomUUID(), role: "user", content: `Attached ${file.name}` },
                ],
              }));
              const form = new FormData();
              form.append("file", file);
              const response = await fetch(`/api/trips/${state.tripId}/images`, { method: "POST", body: form });
              const payload = (await response.json().catch(() => ({}))) as {
                error?: string;
                assistantText?: string;
                observation?: PublicTripState["visionObservations"][number];
              };
              if (!response.ok) {
                setState((current) => ({
                  ...current,
                  running: false,
                  error: payload.error ?? "Upload failed.",
                }));
                return;
              }
              setState((current) => ({
                ...current,
                running: false,
                tripState: payload.observation
                  ? {
                      ...current.tripState,
                      visionObservations: [...current.tripState.visionObservations, payload.observation],
                    }
                  : current.tripState,
                messages: [
                  ...current.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: payload.assistantText ?? "Image received.",
                  },
                ],
              }));
            })();
          }}
          onMessage={(text) => {
            const interrupt = resolveInterrupt(state.tripState, state.events);
            if (interrupt) {
              const matched = matchInterruptReply(text, interrupt, state.tripState.candidateDestinations);
              if (matched) {
                setDraft("");
                startRun({ kind: "resume", interruptId: interrupt.interruptId, value: matched }, text);
                return;
              }
            }
            if (!interrupt && state.tripState.guidedOptions.length) {
              const field = chipFieldForQuestion(state.tripState.lastQuestion);
              const matched = matchGuidedReply(text, state.tripState.guidedOptions, field);
              if (matched) {
                setDraft("");
                startRun({ kind: "chip", field, value: matched }, text);
                return;
              }
            }
            setDraft("");
            startRun({ kind: "message", text }, text);
          }}
        />
        <AtlasCompanion
          events={state.events}
          activeNode={state.activeNode}
          selectedNode={state.selectedNode}
          tripState={state.tripState}
          sheetOpen={state.atlasOpen}
          onSelect={(id) => setState((current) => ({ ...current, selectedNode: id }))}
          onClearSelected={() => setState((current) => ({ ...current, selectedNode: null }))}
          onCloseSheet={() => setState((current) => ({ ...current, atlasOpen: false }))}
          onForget={(key) => startRun({ kind: "chip", field: "memory", value: `forget:${key}` }, `Forget ${key}`)}
        />
      </div>
    </div>
  );
}
