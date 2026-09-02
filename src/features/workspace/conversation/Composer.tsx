"use client";

import { useEffect, useRef } from "react";
import { ArrowUp } from "@phosphor-icons/react";

export function Composer({
  draft,
  disabled,
  placeholder,
  focusToken,
  onDraftChange,
  onSend,
}: {
  draft: string;
  disabled?: boolean;
  placeholder: string;
  focusToken?: number;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusToken) area.current?.focus();
  }, [focusToken]);

  function submit() {
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
  }

  return (
    <form
      className="border-t border-border bg-background px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="composer" className="block font-mono text-[11px] text-subtle">
            Message
          </label>
          <textarea
            ref={area}
            id="composer"
            value={draft}
            disabled={disabled}
            rows={2}
            placeholder={placeholder}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            className="mt-1 min-h-11 w-full resize-none bg-transparent py-2 text-[15px] leading-6 text-text outline-none placeholder:text-subtle focus-visible:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm text-elevated transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-40"
        >
          <span>Send</span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-elevated/15">
            <ArrowUp weight="light" size={14} />
          </span>
        </button>
      </div>
      <p className="font-mono text-[11px] text-subtle">Enter to send. Shift+Enter for a new line.</p>
    </form>
  );
}
