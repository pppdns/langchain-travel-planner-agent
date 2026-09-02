"use client";

import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/src/lib/cn";

const REVISE_ACTIONS = [
  { label: "Slower pace", text: "Make the pace slower and keep days shorter." },
  { label: "Fewer transfers", text: "Cut optional transfers and keep the stay in one area." },
  { label: "Another destination", text: "Suggest another destination that still fits." },
] as const;

export function ReviseDrawer({
  disabled,
  onRevise,
}: {
  disabled?: boolean;
  onRevise: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="mt-8 rounded-[8px] border border-border bg-elevated">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between px-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="text-sm text-text">Revise</span>
        {open ? <CaretUp weight="light" size={16} /> : <CaretDown weight="light" size={16} />}
      </button>
      {open && (
        <form
          className="border-t border-border px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.trim()) return;
            const text = draft.trim();
            setDraft("");
            onRevise(text);
          }}
        >
          <div className="flex flex-wrap gap-2">
            {REVISE_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={disabled}
                onClick={() => onRevise(action.text)}
                className={cn(
                  "min-h-11 rounded-full border border-border bg-background px-4 text-sm text-text",
                  "hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  "disabled:opacity-50",
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
          <label htmlFor="revise-composer" className="sr-only">
            Revise the plan
          </label>
          <div className="mt-3 flex items-end gap-3">
            <textarea
              id="revise-composer"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              placeholder="Ask for a change to this plan."
              className="min-h-11 flex-1 resize-none rounded-[8px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={disabled || !draft.trim()}
              className="min-h-11 rounded-[8px] bg-accent px-4 text-sm text-elevated disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
