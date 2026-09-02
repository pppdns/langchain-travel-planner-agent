"use client";

import { useEffect, useRef, useState } from "react";

export function useListKeys({
  count,
  initialActive = 0,
  disabled,
  enableDigits,
  onConfirm,
}: {
  count: number;
  initialActive?: number;
  disabled?: boolean;
  enableDigits?: boolean;
  onConfirm: (index: number) => void;
}) {
  const [active, setActive] = useState(initialActive);
  const activeRef = useRef(initialActive);
  const confirmRef = useRef(onConfirm);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    confirmRef.current = onConfirm;
  }, [onConfirm]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (disabled || count === 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, input, select, [contenteditable='true']")) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => (index + 1) % count);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => (index - 1 + count) % count);
      } else if (event.key === "Enter") {
        event.preventDefault();
        confirmRef.current(activeRef.current);
      } else if (enableDigits && /^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index < count) {
          event.preventDefault();
          confirmRef.current(index);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, disabled, enableDigits]);

  return { active, setActive };
}
