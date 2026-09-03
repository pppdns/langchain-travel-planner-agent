"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

export function TypeLine({
  text,
  started = true,
  as: Tag = "p",
  className,
  ms = 15,
  onDone,
}: {
  text: string;
  started?: boolean;
  as?: "p" | "h1" | "h2" | "span";
  className?: string;
  ms?: number;
  onDone?: () => void;
}) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  const [notified, setNotified] = useState(false);
  const shown = !started ? 0 : reduce ? text.length : count;
  const complete = started && shown >= text.length;

  useEffect(() => {
    if (!started) return;
    if (reduce || count >= text.length) {
      if (notified) return;
      const id = window.setTimeout(() => {
        setNotified(true);
        onDone?.();
      }, 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setCount((value) => value + 1), ms);
    return () => window.clearTimeout(id);
  }, [count, ms, notified, onDone, reduce, started, text.length]);

  return (
    <Tag className={className}>
      {text.slice(0, shown)}
      {started && !complete && !reduce ? <span className="type-caret" aria-hidden="true" /> : null}
    </Tag>
  );
}
