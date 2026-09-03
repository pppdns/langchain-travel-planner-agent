"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Image as ImageIcon } from "@phosphor-icons/react";

export function Composer({
  draft,
  disabled,
  placeholder,
  focusToken,
  uploadsEnabled,
  onDraftChange,
  onSend,
  onAttach,
}: {
  draft: string;
  disabled?: boolean;
  placeholder: string;
  focusToken?: number;
  uploadsEnabled?: boolean;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => void;
  onAttach?: (file: File) => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
      className="border-t border-border bg-background/90 px-5 pb-5 pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="rounded-[14px] border border-border bg-surface p-1.5 shadow-[inset_0_1px_0_oklch(0.93_0.014_85/0.04)]">
        <div className="rounded-[10px] bg-elevated px-4 py-3 shadow-[inset_0_1px_0_oklch(0.93_0.014_85/0.05)]">
          <label htmlFor="composer" className="block font-mono text-[11px] text-subtle">
            Message
          </label>
          <div className="mt-1 flex items-end gap-3">
            {uploadsEnabled && onAttach && (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onAttach(file);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => fileInput.current?.click()}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-accent hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
                >
                  <ImageIcon weight="light" size={16} />
                  <span className="sr-only">Attach scenery</span>
                </button>
              </>
            )}
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
              className="min-h-11 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-text outline-none placeholder:text-subtle"
            />
            <button
              type="submit"
              disabled={disabled || !draft.trim()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm text-ink transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:opacity-40"
            >
              <span>Send</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/10">
                <ArrowUp weight="light" size={14} />
              </span>
            </button>
          </div>
        </div>
      </div>
      <p className="mt-2 px-1 font-mono text-[11px] text-subtle">
        Enter to send. Shift+Enter for a new line.
        {uploadsEnabled ? " JPEG, PNG, or WebP scenery only." : ""}
      </p>
    </form>
  );
}
