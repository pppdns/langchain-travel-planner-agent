"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { emptyTripState } from "@/src/ai/graph/state";
import type { GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { StarterId } from "@/src/ai/contracts/http";
import { OrchestrationAtlas } from "@/src/features/workspace/atlas/OrchestrationAtlas";
import { Journal } from "@/src/features/workspace/journal/Journal";
import { NodeInspector } from "@/src/features/workspace/inspector/NodeInspector";
import type { JournalMessage, WorkspaceState } from "@/src/features/workspace/types";

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
    running: false,
    error: null,
  });
  const [draft, setDraft] = useState("");
  const [consent, setConsent] = useState(false);

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
        await run(payload.tripId, { kind: "replay", starterId: initialReplay });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialReplay]);

  async function run(tripId: string, body: Record<string, unknown>) {
    setState((current) => ({ ...current, running: true, error: null }));
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
    const nextEvents: PublicEvent[] = [];
    await readNdjson(response, (frame) => {
      if (frame.event) {
        nextEvents.push(frame.event);
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
          if (last?.role === "assistant" && last.id === "streaming") {
            messages[messages.length - 1] = { ...last, content: assistant };
          } else {
            messages.push({ id: "streaming", role: "assistant", content: assistant });
          }
          return { ...current, messages };
        });
      }
    });
    setState((current) => ({
      ...current,
      running: false,
      messages: current.messages.map((message) =>
        message.id === "streaming" ? { ...message, id: crypto.randomUUID() } : message,
      ),
    }));
    void nextEvents;
  }

  function pushUser(content: string) {
    const message: JournalMessage = { id: crypto.randomUUID(), role: "user", content };
    setState((current) => ({ ...current, messages: [...current.messages, message] }));
  }

  const dossier = useMemo(
    () => [
      state.tripState.destinationName ?? "Open",
      state.tripState.dates.durationNights ? `${state.tripState.dates.durationNights} nights` : "Dates open",
      `${state.tripState.travelers.adults} adults${state.tripState.travelers.children ? ` · ${state.tripState.travelers.children} child` : ""}`,
      state.tripState.budget.amount ? `${state.tripState.budget.amount} ${state.tripState.budget.currency}` : "Budget open",
    ],
    [state.tripState],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background text-text" data-ready={state.tripId ? "true" : "false"}>
      <a href="#journal" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-elevated focus:px-3 focus:py-2">
        Skip to journal
      </a>
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">Route State</p>
          <p className="text-sm text-muted">Orchestration Atlas · trip planner</p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{state.mode}</span>
          <Link href="/case-study" className="text-muted hover:text-text">
            Case study
          </Link>
          <a href="https://github.com" className="text-subtle hover:text-text">
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

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <div className="flex min-h-[42vh] flex-col gap-3 p-4">
          <div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
            {dossier.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            <OrchestrationAtlas
              events={state.events}
              activeNode={state.activeNode}
              selectedNode={state.selectedNode}
              onSelect={(id) => setState((current) => ({ ...current, selectedNode: id }))}
            />
          </div>
        </div>
        <div id="journal" className="min-h-0 border-t border-border lg:border-l lg:border-t-0">
          <Journal
            messages={state.messages}
            tripState={state.tripState}
            events={state.events}
            running={state.running}
            onStarter={(starterId) => {
              if (!state.tripId) return;
              pushUser(starterId);
              void run(state.tripId, { kind: "starter", starterId });
            }}
            onChip={(field, value) => {
              if (!state.tripId) return;
              pushUser(value);
              void run(state.tripId, { kind: "chip", field, value });
            }}
            onResume={(interruptId, value) => {
              if (!state.tripId) return;
              pushUser(value);
              void run(state.tripId, { kind: "resume", interruptId, value });
            }}
          />
        </div>
      </div>

      {state.selectedNode && (
        <NodeInspector
          nodeId={state.selectedNode as GraphNodeId}
          events={state.events}
          tripState={state.tripState}
          onClose={() => setState((current) => ({ ...current, selectedNode: null }))}
        />
      )}

      <form
        className="sticky bottom-0 border-t border-border bg-elevated px-5 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!state.tripId || !draft.trim()) return;
          const text = draft.trim();
          setDraft("");
          pushUser(text);
          void run(state.tripId, { kind: "message", text });
        }}
      >
        <label htmlFor="composer" className="sr-only">
          Message
        </label>
        <div className="flex items-end gap-3">
          <textarea
            id="composer"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="Ask to revise the plan, or describe the trip."
            className="min-h-11 flex-1 resize-none rounded-[8px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={state.running || !state.tripId}
            className="min-h-11 rounded-[8px] bg-accent px-4 text-sm text-elevated disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          I understand image uploads are optional scenery only, never identity or booking documents.
        </label>
      </form>
    </div>
  );
}
