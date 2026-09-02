"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { emptyTripState } from "@/src/ai/graph/state";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { STARTER_COPY, type StarterId } from "@/src/ai/contracts/http";
import { getDestination } from "@/data/travel/catalog";
import { AtlasCompanion } from "@/src/features/workspace/conversation/AtlasCompanion";
import { Conversation } from "@/src/features/workspace/conversation/Conversation";
import { GraphPulse } from "@/src/features/workspace/conversation/GraphPulse";
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
    tripState: emptyTripState(),
    events: [],
    messages: [],
    activeNode: null,
    selectedNode: null,
    atlasOpen: false,
    running: false,
    error: null,
  });
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const created = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await created.json()) as { tripId?: string; mode?: WorkspaceState["mode"]; error?: string };
      if (cancelled) return;
      if (!created.ok || !payload.tripId) {
        setState((current) => ({ ...current, error: payload.error ?? "Could not start a trip." }));
        return;
      }
      setState((current) => ({ ...current, tripId: payload.tripId!, mode: payload.mode ?? "fake" }));
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
            frame.event!.type === "trip-state" ? { ...current.tripState, ...frame.event!.patch } : current.tripState,
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
    setState((current) => ({
      ...current,
      running: false,
      messages: current.messages.map((message) =>
        message.id === streamingId ? { ...message, id: crypto.randomUUID() } : message,
      ),
    }));
  }

  function startRun(body: Record<string, unknown>, userText?: string) {
    if (!state.tripId) return;
    void run(state.tripId, body, userText);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-text" data-ready={state.tripId ? "true" : "false"}>
      <a
        href="#conversation"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-elevated focus:px-3 focus:py-2"
      >
        Skip to conversation
      </a>
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <p className="text-sm text-text">Route State</p>
          <GraphPulse
            events={state.events}
            activeNode={state.activeNode}
            onInspect={() => setState((current) => ({ ...current, atlasOpen: true }))}
          />
        </div>
        <nav className="flex shrink-0 items-center gap-4 text-sm">
          <Link href="/case-study" className="text-muted hover:text-text">
            Case study
          </Link>
          <a href="https://github.com" className="hidden text-subtle hover:text-text sm:inline">
            Built by Denes Papp
          </a>
        </nav>
      </header>

      {state.mode === "replay" && (
        <div className="border-b border-warning/30 bg-elevated px-5 py-2 text-sm text-warning">
          Recorded run. The events are the same public protocol as live planning.
        </div>
      )}
      {state.error && (
        <div className="border-b border-accent/30 bg-elevated px-5 py-2 text-sm text-accent">{state.error}</div>
      )}

      <div aria-live="polite" className="sr-only">
        {latestGraphCaption(state.events)}
      </div>

      <div className="flex min-h-0 flex-1">
        <Conversation
          messages={state.messages}
          tripState={state.tripState}
          events={state.events}
          running={state.running}
          draft={draft}
          onDraftChange={setDraft}
          onStarter={(starterId) => startRun({ kind: "starter", starterId }, STARTER_COPY[starterId].label)}
          onChip={(field, value) => startRun({ kind: "chip", field, value }, value)}
          onResume={(interruptId, value) => {
            const name = getDestination(value)?.name ?? value;
            startRun({ kind: "resume", interruptId, value }, name);
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
            if (state.tripState.currentPlanningStage === "gathering" && state.tripState.guidedOptions.length) {
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
        />
      </div>
    </div>
  );
}
