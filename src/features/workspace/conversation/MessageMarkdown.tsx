"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { Streamdown, type Components } from "streamdown";
import { cn } from "@/src/lib/cn";

type HastProps<T> = T & { node?: unknown; children?: ReactNode };

function stripHast<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const next = { ...props };
  delete next.node;
  return next;
}

const components: Components = {
  p: (props: HastProps<HTMLAttributes<HTMLParagraphElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <p className={cn("mb-3 last:mb-0", className)} {...rest}>
        {children}
      </p>
    );
  },
  h1: (props: HastProps<HTMLAttributes<HTMLHeadingElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <h2 className={cn("mb-2 font-display text-[1.25rem] font-semibold leading-7 tracking-tight", className)} {...rest}>
        {children}
      </h2>
    );
  },
  h2: (props: HastProps<HTMLAttributes<HTMLHeadingElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <h3 className={cn("mb-2 font-display text-[1.1rem] font-semibold leading-7 tracking-tight", className)} {...rest}>
        {children}
      </h3>
    );
  },
  h3: (props: HastProps<HTMLAttributes<HTMLHeadingElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <h4 className={cn("mb-2 font-display text-[1rem] font-semibold leading-7", className)} {...rest}>
        {children}
      </h4>
    );
  },
  ul: (props: HastProps<HTMLAttributes<HTMLUListElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <ul className={cn("mb-3 list-disc space-y-1 pl-5 last:mb-0", className)} {...rest}>
        {children}
      </ul>
    );
  },
  ol: (props: HastProps<HTMLAttributes<HTMLOListElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <ol className={cn("mb-3 list-decimal space-y-1 pl-5 last:mb-0", className)} {...rest}>
        {children}
      </ol>
    );
  },
  li: (props: HastProps<HTMLAttributes<HTMLLIElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <li className={cn("leading-7", className)} {...rest}>
        {children}
      </li>
    );
  },
  a: (props: HastProps<HTMLAttributes<HTMLAnchorElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <a
        className={cn("text-accent underline decoration-accent/40 underline-offset-2", className)}
        target="_blank"
        rel="noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  },
  strong: (props: HastProps<HTMLAttributes<HTMLElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <strong className={cn("font-semibold text-text", className)} {...rest}>
        {children}
      </strong>
    );
  },
  em: (props: HastProps<HTMLAttributes<HTMLElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <em className={cn("italic text-text", className)} {...rest}>
        {children}
      </em>
    );
  },
  blockquote: (props: HastProps<HTMLAttributes<HTMLQuoteElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <blockquote className={cn("mb-3 border-l border-accent/50 pl-3 text-muted last:mb-0", className)} {...rest}>
        {children}
      </blockquote>
    );
  },
  code: (props: HastProps<HTMLAttributes<HTMLElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <code className={cn("rounded-sm bg-surface px-1 py-0.5 font-mono text-[13px]", className)} {...rest}>
        {children}
      </code>
    );
  },
  pre: (props: HastProps<HTMLAttributes<HTMLPreElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <pre
        className={cn(
          "mb-3 overflow-x-auto rounded-[10px] border border-border bg-surface px-3 py-2 font-mono text-[13px] leading-6 last:mb-0",
          className,
        )}
        {...rest}
      >
        {children}
      </pre>
    );
  },
  hr: (props: HastProps<HTMLAttributes<HTMLHRElement>>) => {
    const { className, ...rest } = stripHast(props);
    return <hr className={cn("my-3 border-border", className)} {...rest} />;
  },
  table: (props: HastProps<HTMLAttributes<HTMLTableElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <div className="mb-3 overflow-x-auto last:mb-0">
        <table className={cn("w-full border-collapse text-left text-sm", className)} {...rest}>
          {children}
        </table>
      </div>
    );
  },
  th: (props: HastProps<HTMLAttributes<HTMLTableCellElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <th className={cn("border-b border-border px-2 py-1.5 font-mono text-[11px] text-subtle", className)} {...rest}>
        {children}
      </th>
    );
  },
  td: (props: HastProps<HTMLAttributes<HTMLTableCellElement>>) => {
    const { className, children, ...rest } = stripHast(props);
    return (
      <td className={cn("border-b border-border px-2 py-1.5", className)} {...rest}>
        {children}
      </td>
    );
  },
};

export function MessageMarkdown({ text, streaming }: { text: string; streaming?: boolean }) {
  const reduce = useReducedMotion();

  return (
    <div className="planner-md">
      <Streamdown
        mode={streaming ? "streaming" : "static"}
        isAnimating={Boolean(streaming)}
        animated={false}
        controls={false}
        skipHtml
        components={components}
      >
        {text}
      </Streamdown>
      {streaming && !reduce ? <span className="type-caret" aria-hidden="true" /> : null}
    </div>
  );
}
