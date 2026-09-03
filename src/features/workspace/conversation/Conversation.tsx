"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { STARTER_COPY, type StarterId } from "@/src/ai/contracts/http";
import type { PublicTripState } from "@/src/ai/graph/state";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PlateMotif } from "@/data/travel/catalog";
import { latestGraphCaption } from "@/src/features/workspace/atlas/node-status";
import { ChoiceInstrument } from "@/src/features/workspace/conversation/ChoiceInstrument";
import { Composer } from "@/src/features/workspace/conversation/Composer";
import { DestinationInstrument } from "@/src/features/workspace/conversation/DestinationInstrument";
import { FolioInstrument } from "@/src/features/workspace/conversation/FolioInstrument";
import { MotifBand } from "@/src/features/workspace/conversation/MotifBand";
import {
  chipFieldForQuestion,
  isOffScopeQuestion,
  resolveInterrupt,
} from "@/src/features/workspace/conversation/helpers";
import { useListKeys } from "@/src/features/workspace/conversation/useListKeys";
import type { ConversationMessage } from "@/src/features/workspace/types";
import { cn } from "@/src/lib/cn";

const STARTER_IDS = Object.keys(STARTER_COPY) as StarterId[];

const STARTER_MOTIF: Record<StarterId, PlateMotif> = {
  "family-beach-europe": "coast",
  "barcelona-couple": "grid",
  "city-break-budget": "harbor",
  "family-minimal-driving": "hills",
};

function Opening({ disabled, onStarter }: { disabled?: boolean; onStarter: (id: StarterId) => void }) {
  return (
    <div className="max-w-[42rem]">
      <h1 className="font-display text-[2.35rem] font-semibold leading-[1.1] tracking-tight text-text md:text-5xl">
        Where should this trip begin?
      </h1>
      <p className="mt-4 max-w-[34rem] text-[15px] leading-7 text-muted">
        Say the place and the pace. Or start from a trip I already understand.
      </p>
      <nav className="mt-8 grid gap-3" aria-label="Suggested starts">
        {STARTER_IDS.map((id, index) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onStarter(id)}
            className={cn(
              "flex min-h-11 w-full items-stretch gap-0 rounded-[14px] border border-border bg-surface p-1.5 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "hover:border-accent/70 hover:bg-elevated",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              "disabled:opacity-50",
            )}
          >
            <MotifBand motif={STARTER_MOTIF[id]} className="h-16 w-16 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-2">
              <span className="font-mono text-[11px] text-accent">{String(index + 1).padStart(2, "0")}</span>
              <span className="mt-1 text-[15px] leading-6 text-text">{STARTER_COPY[id].label}</span>
              <span className="mt-0.5 text-sm text-muted">{STARTER_COPY[id].firstQuestionHint}</span>
            </span>
          </button>
        ))}
      </nav>
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
      <div className="mt-4 grid gap-2">
        {options.map((option, index) => {
          const selected = active === index;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onMouseEnter={() => setActive(index)}
              onClick={() => onChoose(option.id)}
              className={cn(
                "flex min-h-11 w-full items-center rounded-[14px] border p-1.5 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                selected ? "border-accent bg-elevated shadow-[0_18px_50px_oklch(0.12_0.03_265/0.45)]" : "border-border bg-surface",
                disabled && "opacity-50",
              )}
            >
              <span className="flex min-h-11 flex-1 items-center gap-3 rounded-[10px] bg-elevated px-4">
                <span className={cn("font-mono text-[11px]", selected ? "text-accent" : "text-subtle")}>
                  {index + 1}
                </span>
                <span className={cn("text-[15px]", selected ? "text-text" : "text-muted")}>{option.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[11px] text-subtle">1 or 2 to choose. Or type the option below.</p>
    </div>
  );
}

export function Conversation({
  messages,
  tripState,
  events,
  running,
  draft,
  onDraftChange,
  onStarter,
  onChip,
  onResume,
  onMessage,
}: {
  messages: ConversationMessage[];
  tripState: PublicTripState;
  events: PublicEvent[];
  running: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onStarter: (id: StarterId) => void;
  onChip: (field: string, value: string) => void;
  onResume: (interruptId: string, value: string) => void;
  onMessage: (text: string) => void;
}) {
  const reduce = useReducedMotion();
  const end = useRef<HTMLDivElement>(null);
  const [focusToken, setFocusToken] = useState(0);
  const interrupt = resolveInterrupt(tripState, events);
  const recommendedSlug =
    interrupt?.options.find((option) => option.recommended)?.id ?? tripState.candidateDestinations[0]?.slug;
  const offScope = isOffScopeQuestion(tripState.lastQuestion) || /only plan trips/i.test(messages.at(-1)?.content ?? "");
  const showChoices =
    !running && !interrupt && tripState.currentPlanningStage === "gathering" && tripState.guidedOptions.length > 0;
  const showDestinations =
    !running &&
    interrupt?.interruptType === "choose_destination" &&
    tripState.candidateDestinations.length > 0;
  const showTradeoff = !running && interrupt?.interruptType === "approve_tradeoff";
  const showFolio = Boolean(tripState.itinerary) && !showDestinations && !showTradeoff;
  const hasInstrument = showChoices || showDestinations || showTradeoff || showFolio;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [messages, running, tripState.pendingInterrupt, tripState.itinerary, reduce]);

  const placeholder = showDestinations
    ? "Type a place name, or pick from the list."
    : showChoices
      ? "Type an answer, or pick from the list."
      : tripState.itinerary
        ? "Revise the plan, or ask for a different place."
        : "Describe the trip, or answer in your own words.";

  return (
    <section id="conversation" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="desk-field min-h-0 flex-1 overflow-y-auto px-5 py-8 md:px-8 md:py-10">
        {messages.length === 0 && <Opening disabled={running} onStarter={onStarter} />}

        <div className={cn(messages.length > 0 && "space-y-7", messages.length === 0 && "hidden")}>
          {messages.map((message) => (
            <motion.article
              key={message.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[42rem]"
            >
              {message.role === "user" ? (
                <div className="rounded-[14px] border border-border bg-surface p-1.5">
                  <div className="rounded-[10px] bg-elevated px-4 py-3">
                    <p className="font-mono text-[11px] text-accent">You</p>
                    <p className="mt-1 text-[15px] leading-7 text-text">{message.content}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-mono text-[11px] text-subtle">Planner</p>
                  <p className="mt-1 text-[15px] leading-7 text-text">{message.content}</p>
                </div>
              )}
            </motion.article>
          ))}
        </div>

        {running && latestGraphCaption(events) !== "Quiet until you start." && (
          <p className="mt-8 max-w-[42rem] font-mono text-[12px] text-accent">{latestGraphCaption(events)}</p>
        )}

        {hasInstrument && (
          <div className="mt-8 max-w-[52rem]">
            {showChoices && (
              <ChoiceInstrument
                question={tripState.lastQuestion ?? "What kind of trip are you trying to make?"}
                options={tripState.guidedOptions}
                field={chipFieldForQuestion(tripState.lastQuestion)}
                disabled={running}
                onPick={onChip}
              />
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
          </div>
        )}

        {offScope && messages.length > 0 && (
          <div className="mt-10">
            <Opening disabled={running} onStarter={onStarter} />
          </div>
        )}

        {showFolio && !running && (
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { label: "Slower pace", text: "Make the pace slower and keep days shorter." },
              { label: "Fewer transfers", text: "Cut optional transfers and keep the stay in one area." },
              { label: "Another destination", text: "Suggest another destination that still fits." },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  onDraftChange(action.text);
                  setFocusToken((token) => token + 1);
                }}
                className="min-h-11 rounded-full border border-border bg-surface px-4 text-sm text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-accent hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <div ref={end} />
      </div>

      <Composer
        draft={draft}
        disabled={running}
        placeholder={placeholder}
        focusToken={focusToken}
        onDraftChange={onDraftChange}
        onSend={onMessage}
      />
    </section>
  );
}
