"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { STARTER_COPY, type StarterId } from "@/src/ai/contracts/http";
import { getGraphNode, type GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicTripState } from "@/src/ai/graph/state";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PlateMotif } from "@/data/travel/catalog";
import { AgentProcessPath, AgentStatus } from "@/src/features/workspace/conversation/AgentStatus";
import { buildAgentProcess } from "@/src/features/workspace/conversation/agent-process";
import { ChoiceInstrument } from "@/src/features/workspace/conversation/ChoiceInstrument";
import { Composer } from "@/src/features/workspace/conversation/Composer";
import { DestinationInstrument } from "@/src/features/workspace/conversation/DestinationInstrument";
import { EvidenceStrip } from "@/src/features/workspace/conversation/EvidenceStrip";
import { FolioInstrument } from "@/src/features/workspace/conversation/FolioInstrument";
import { MessageMarkdown } from "@/src/features/workspace/conversation/MessageMarkdown";
import { MotifBand } from "@/src/features/workspace/conversation/MotifBand";
import { TypeLine } from "@/src/features/workspace/conversation/TypeLine";
import {
  chipFieldForQuestion,
  isOffScopeQuestion,
  resolveInterrupt,
} from "@/src/features/workspace/conversation/helpers";
import { useListKeys } from "@/src/features/workspace/conversation/useListKeys";
import type { ConversationMessage } from "@/src/features/workspace/types";
import { cn } from "@/src/lib/cn";

const STARTER_IDS = Object.keys(STARTER_COPY) as StarterId[];
const EASE = [0.16, 1, 0.3, 1] as const;

const STARTER_MOTIF: Record<StarterId, PlateMotif> = {
  "family-beach-europe": "coast",
  "barcelona-couple": "grid",
  "city-break-budget": "harbor",
  "family-minimal-driving": "hills",
};

function Opening({ disabled, onStarter }: { disabled?: boolean; onStarter: (id: StarterId) => void }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"think" | "write" | "ask" | "ready">(reduce ? "ready" : "think");

  useEffect(() => {
    if (reduce) return;
    const id = window.setTimeout(() => setPhase("write"), 420);
    return () => window.clearTimeout(id);
  }, [reduce]);

  return (
    <div className="mx-auto w-full max-w-[40rem]">
      {(phase === "think" || phase === "write") && (
        <AgentStatus label={phase === "think" ? "Thinking" : "Typing"} />
      )}

      {phase !== "think" && (
        <div className="mt-3">
          <p className="font-mono text-[11px] text-subtle">Planner</p>
          <div className="mt-1 rounded-[16px] rounded-tl-md bg-elevated px-5 py-4 shadow-[inset_0_1px_0_oklch(0.93_0.014_85/0.05)]">
            <TypeLine
              as="h1"
              text="Where should this trip begin?"
              started
              className="font-display text-[2.1rem] font-semibold leading-[1.12] tracking-tight text-text md:text-[2.6rem]"
              onDone={() => setPhase((current) => (current === "write" ? "ask" : current))}
            />
            {(phase === "ask" || phase === "ready") && (
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: EASE }}
                onAnimationComplete={() => setPhase((current) => (current === "ask" ? "ready" : current))}
                className="mt-3 text-[15px] leading-7 text-muted"
              >
                Say the place and the pace. Or start from a trip I already understand.
              </motion.p>
            )}
          </div>
        </div>
      )}

      {phase === "ready" && (
        <nav className="mt-4 flex flex-col gap-2" aria-label="Suggested starts">
          {STARTER_IDS.map((id, index) => (
            <motion.button
              key={id}
              type="button"
              disabled={disabled}
              initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.38, delay: index * 0.07, ease: EASE }}
              onClick={() => onStarter(id)}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-[16px] border border-border bg-surface px-1.5 py-1.5 text-left",
                "transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-accent/70 hover:bg-elevated",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                "disabled:opacity-50",
              )}
            >
              <MotifBand motif={STARTER_MOTIF[id]} className="h-12 w-12 shrink-0" />
              <span className="min-w-0 flex-1 py-1 pr-3">
                <span className="block text-[15px] leading-6 text-text">{STARTER_COPY[id].label}</span>
                <span className="mt-0.5 block truncate text-sm text-muted">{STARTER_COPY[id].firstQuestionHint}</span>
              </span>
            </motion.button>
          ))}
        </nav>
      )}
    </div>
  );
}

function TradeoffInstrument({
  prompt,
  options,
  disabled,
  onChoose,
}: {
  prompt: string;
  options: { id: string; label: string }[];
  disabled?: boolean;
  onChoose: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const { active, setActive } = useListKeys({
    count: options.length,
    disabled,
    enableDigits: true,
    onConfirm: (index) => {
      const next = options[index];
      if (next) onChoose(next.id);
    },
  });

  return (
    <div role="radiogroup" aria-label={prompt} tabIndex={0} className="outline-none">
      <p className="text-sm leading-6 text-muted">{prompt}</p>
      <div className="mt-3 flex flex-col gap-2">
        {options.map((option, index) => {
          const selected = active === index;
          return (
            <motion.button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, delay: index * 0.06, ease: EASE }}
              onMouseEnter={() => setActive(index)}
              onClick={() => onChoose(option.id)}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-full border px-4 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                selected ? "border-accent bg-accent/12 text-text" : "border-border bg-surface text-muted",
                disabled && "opacity-50",
              )}
            >
              <span className={cn("font-mono text-[11px]", selected ? "text-accent" : "text-subtle")}>{index + 1}</span>
              <span className="text-[15px]">{option.label}</span>
            </motion.button>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[11px] text-subtle">1 or 2 to choose. Or type the option below.</p>
    </div>
  );
}

function ChatMessage({ message, streaming }: { message: ConversationMessage; streaming?: boolean }) {
  const reduce = useReducedMotion();
  const user = message.role === "user";

  return (
    <motion.article
      initial={reduce ? false : user ? { opacity: 0, x: 18 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.36, ease: EASE }}
      className={cn("flex", user ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[34rem]", user && "text-right")}>
        <p className={cn("font-mono text-[11px]", user ? "text-accent" : "text-subtle")}>{user ? "You" : "Planner"}</p>
        <div
          className={cn(
            "mt-1 px-4 py-3 text-left text-[15px] leading-7",
            user
              ? "rounded-[16px] rounded-tr-md border border-accent/30 bg-accent/12 text-text"
              : "rounded-[16px] rounded-tl-md bg-elevated text-text shadow-[inset_0_1px_0_oklch(0.93_0.014_85/0.05)]",
          )}
        >
          {user ? message.content : <MessageMarkdown text={message.content} streaming={streaming} />}
        </div>
        {!user && message.process && message.process.steps.length > 0 && (
          <div className="mt-2 pl-1">
            <AgentProcessPath process={message.process} />
          </div>
        )}
      </div>
    </motion.article>
  );
}

export function Conversation({
  messages,
  tripState,
  events,
  runEvents,
  activeNode,
  running,
  presence,
  draft,
  onDraftChange,
  onStarter,
  onChip,
  onResume,
  onMessage,
  onAttach,
  uploadsEnabled,
}: {
  messages: ConversationMessage[];
  tripState: PublicTripState;
  events: PublicEvent[];
  runEvents?: PublicEvent[];
  activeNode: GraphNodeId | null;
  running: boolean;
  presence: { busy: boolean; reveal: boolean; label: string };
  draft: string;
  uploadsEnabled?: boolean;
  onDraftChange: (value: string) => void;
  onStarter: (id: StarterId) => void;
  onChip: (field: string, value: string) => void;
  onResume: (interruptId: string, value: string) => void;
  onMessage: (text: string) => void;
  onAttach?: (file: File) => void;
}) {
  const reduce = useReducedMotion();
  const end = useRef<HTMLDivElement>(null);
  const liveProcess = buildAgentProcess(runEvents ?? []);
  const nodeLabel = activeNode ? getGraphNode(activeNode).label : undefined;
  const interrupt = resolveInterrupt(tripState, events);
  const recommendedSlug =
    interrupt?.options.find((option) => option.recommended)?.id ?? tripState.candidateDestinations[0]?.slug;
  const offScope = isOffScopeQuestion(tripState.lastQuestion) || /only plan trips/i.test(messages.at(-1)?.content ?? "");
  const last = messages.at(-1);
  const shownMessages = messages.filter((message) => message.role === "user" || message.content);
  const streamingId = last?.role === "assistant" && (running || last.id === "streaming") ? last.id : null;
  const turnReady = presence.reveal;
  const showChoices =
    turnReady && !interrupt && tripState.currentPlanningStage === "gathering" && tripState.guidedOptions.length > 0;
  const showDestinations =
    turnReady && interrupt?.interruptType === "choose_destination" && tripState.candidateDestinations.length > 0;
  const showTradeoff = turnReady && interrupt?.interruptType === "approve_tradeoff";
  const showFolio =
    turnReady &&
    Boolean(tripState.itinerary) &&
    !showDestinations &&
    !showTradeoff &&
    (tripState.lastTurnKind === "plan" || tripState.lastTurnKind == null);
  const hasInstrument = showChoices || showDestinations || showTradeoff || showFolio;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [hasInstrument, messages, presence.busy, reduce, tripState.itinerary, tripState.pendingInterrupt]);

  const placeholder = showDestinations
    ? "Type a place name, or pick from the list."
    : showChoices
      ? "Type an answer, or pick from the list."
      : tripState.itinerary
        ? "Revise the plan, or ask for a different place."
        : "Describe the trip, or answer in your own words.";

  return (
    <section id="conversation" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="desk-field min-h-0 flex-1 overflow-y-auto px-5 py-7 md:px-8 md:py-9">
        {messages.length === 0 && <Opening disabled={running} onStarter={onStarter} />}

        <div className={cn("mx-auto w-full max-w-[40rem] space-y-5", messages.length === 0 && "hidden")}>
          {shownMessages.map((message) => (
            <ChatMessage key={message.id} message={message} streaming={streamingId === message.id} />
          ))}

          {presence.busy && (
            <AgentStatus
              label={presence.label}
              nodeLabel={nodeLabel}
              process={liveProcess.steps.length ? liveProcess : undefined}
            />
          )}
        </div>

        {hasInstrument && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: EASE }}
            className="mx-auto mt-4 w-full max-w-[40rem]"
          >
            {showChoices && (
              <ChoiceInstrument
                question={tripState.lastQuestion ?? "What kind of trip are you trying to make?"}
                options={tripState.guidedOptions}
                field={chipFieldForQuestion(tripState.lastQuestion)}
                disabled={running}
                onPick={onChip}
              />
            )}

            {(showDestinations || showFolio || showTradeoff) && (
              <div className="mb-3">
                <EvidenceStrip events={events} />
              </div>
            )}

            {showDestinations && interrupt && (
              <DestinationInstrument
                title={interrupt.title}
                prompt={interrupt.prompt}
                candidates={tripState.candidateDestinations}
                recommendedSlug={recommendedSlug}
                disabled={running}
                onChoose={(slug) => onResume(interrupt.interruptId, slug)}
              />
            )}

            {showTradeoff && interrupt && (
              <TradeoffInstrument
                prompt={interrupt.prompt}
                options={interrupt.options}
                disabled={running}
                onChoose={(id) => onResume(interrupt.interruptId, id)}
              />
            )}

            {showFolio && tripState.itinerary && <FolioInstrument itinerary={tripState.itinerary} />}
          </motion.div>
        )}

        {offScope && messages.length > 0 && turnReady && (
          <div className="mt-8">
            <Opening disabled={running} onStarter={onStarter} />
          </div>
        )}

        {showFolio && !running && (
          <div className="mx-auto mt-5 flex w-full max-w-[40rem] flex-wrap gap-2">
            {[
              { label: "Slower pace", text: "Make the pace slower and keep days shorter." },
              { label: "Fewer transfers", text: "Cut optional transfers and keep the stay in one area." },
              { label: "Another destination", text: "Suggest another destination that still fits." },
            ].map((action, index) => (
              <motion.button
                key={action.label}
                type="button"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 + index * 0.05, ease: EASE }}
                onClick={() => onMessage(action.text)}
                className="min-h-11 rounded-full border border-border bg-surface px-4 text-sm text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-accent hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {action.label}
              </motion.button>
            ))}
          </div>
        )}

        <div ref={end} />
      </div>

      <Composer
        draft={draft}
        disabled={running}
        placeholder={placeholder}
        uploadsEnabled={uploadsEnabled}
        onDraftChange={onDraftChange}
        onSend={onMessage}
        onAttach={onAttach}
      />
    </section>
  );
}
