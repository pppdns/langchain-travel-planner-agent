"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { emptyTripState } from "@/src/ai/graph/state";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { StarterId } from "@/src/ai/contracts/http";
import { AtlasOverlay } from "@/src/features/workspace/studio/AtlasOverlay";
import { ExecutionRail } from "@/src/features/workspace/studio/ExecutionRail";
import { TripPlates } from "@/src/features/workspace/studio/TripPlates";
import { TripStudio } from "@/src/features/workspace/studio/TripStudio";
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
    lastAssistantText: "",
    activeNode: null,
    selectedNode: null,
    atlasOpen: false,
    running: false,
    error: null,
  });

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
    setState((current) => ({ ...current, running: true, error: null, lastAssistantText: "" }));
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
        setState((current) => ({ ...current, lastAssistantText: assistant }));
      }
    });
    setState((current) => ({ ...current, running: false }));
  }

  function startRun(body: Record<string, unknown>) {
    if (!state.tripId) return;
    void run(state.tripId, body);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-text" data-ready={state.tripId ? "true" : "false"}>
      <a
        href="#studio"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-elevated focus:px-3 focus:py-2"
      >
        Skip to studio
      </a>
      <header className="border-b border-border px-4 py-3 md:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">Route State</p>
              <p className="text-sm text-muted">Trip Studio</p>
            </div>
            <nav className="flex items-center gap-4 text-sm lg:hidden">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{state.mode}</span>
              <Link href="/case-study" className="text-muted hover:text-text">
                Case study
              </Link>
            </nav>
          </div>
          <div className="min-w-0 flex-1 lg:max-w-3xl">
            <TripPlates tripState={state.tripState} />
          </div>
          <nav className="hidden items-center gap-4 text-sm lg:flex">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{state.mode}</span>
            <Link href="/case-study" className="text-muted hover:text-text">
              Case study
            </Link>
            <a href="https://github.com" className="text-subtle hover:text-text">
              Built by Denes Papp
            </a>
          </nav>
        </div>
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

      <ExecutionRail
        events={state.events}
        activeNode={state.activeNode}
        onOpenNode={(id) => setState((current) => ({ ...current, selectedNode: id, atlasOpen: true }))}
      />

      <div className="min-h-0 flex-1">
        <TripStudio
          tripState={state.tripState}
          events={state.events}
          running={state.running}
          lastAssistantText={state.lastAssistantText}
          onStarter={(starterId) => startRun({ kind: "starter", starterId })}
          onChip={(field, value) => startRun({ kind: "chip", field, value })}
          onResume={(interruptId, value) => startRun({ kind: "resume", interruptId, value })}
          onMessage={(text) => startRun({ kind: "message", text })}
        />
      </div>

      {state.atlasOpen && (
        <AtlasOverlay
          events={state.events}
          activeNode={state.activeNode}
          selectedNode={state.selectedNode}
          tripState={state.tripState}
          onSelect={(id) => setState((current) => ({ ...current, selectedNode: id }))}
          onClearSelected={() => setState((current) => ({ ...current, selectedNode: null }))}
          onClose={() => setState((current) => ({ ...current, atlasOpen: false, selectedNode: null }))}
        />
      )}
    </div>
  );
}
