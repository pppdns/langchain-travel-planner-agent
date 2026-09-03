"use client";

import { motion, useReducedMotion } from "motion/react";
import { processHeadline, type AgentProcess, type AgentProcessStatus } from "@/src/features/workspace/conversation/agent-process";
import { cn } from "@/src/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

function pipClass(status: AgentProcessStatus) {
  if (status === "active" || status === "waiting") return "bg-accent";
  return "bg-border";
}

function labelClass(status: AgentProcessStatus) {
  if (status === "active" || status === "waiting") return "text-accent";
  return "text-muted";
}

export function AgentProcessPath({ process, live }: { process: AgentProcess; live?: boolean }) {
  if (!process.steps.length) return null;
  const notes = process.steps.flatMap((step) => step.notes).slice(0, 3);

  return (
    <div className="mt-2">
      <ol className="flex flex-col" aria-label="Graph path this pass">
        {process.steps.map((step, index) => {
          const last = index === process.steps.length - 1;
          return (
            <li key={`${step.node}-${index}`} className="flex gap-2.5">
              <span className="flex w-2 shrink-0 flex-col items-center" aria-hidden="true">
                <span className={cn("mt-1 size-1.5 rounded-full", pipClass(step.status))} />
                {!last && <span className="mt-1 w-px flex-1 bg-border" />}
              </span>
              <p className={cn("min-w-0 font-mono text-[11px] leading-4", !last && "pb-2")}>
                <span className={labelClass(step.status)}>{step.label}</span>
                {step.caption ? <span className="text-subtle"> · {step.caption}</span> : null}
              </p>
            </li>
          );
        })}
      </ol>
      {notes.length > 0 && (
        <p className="mt-1.5 font-mono text-[11px] leading-4 text-subtle">
          {live ? "Reading" : "Read"} {notes.join(", ")}
        </p>
      )}
    </div>
  );
}

export function AgentStatus({
  label,
  nodeLabel,
  process,
  live = true,
}: {
  label: string;
  nodeLabel?: string;
  process?: AgentProcess;
  live?: boolean;
}) {
  const reduce = useReducedMotion();
  const headline = processHeadline(nodeLabel, label);

  return (
    <div className="py-1.5" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        {live && (
          <span className="hud-pips" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        )}
        <span className="font-mono text-[12px] text-accent">{headline}</span>
      </div>
      {process && process.steps.length > 0 && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          className={live ? "pl-8" : undefined}
        >
          <AgentProcessPath process={process} live={live} />
        </motion.div>
      )}
    </div>
  );
}
