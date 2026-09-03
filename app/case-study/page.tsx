import Link from "next/link";

export const metadata = {
  title: "Engineering case study · Route State",
};

const ARGUMENTS = [
  {
    title: "Graph spec is shared.",
    body: (
      <>
        <code>src/ai/graph/spec.ts</code> feeds the compiled graph, the atlas, the LangFlow artifact, and
        replay fixtures. Node IDs do not drift.
      </>
    ),
  },
  {
    title: "Interrupts are first-class.",
    body: (
      <>
        Destination choice and the pace-versus-budget tradeoff are dedicated nodes. Resume uses{" "}
        <code>Command</code>, not a fake user message stuffed into the transcript.
      </>
    ),
  },
  {
    title: "Public events are allowlisted.",
    body: "The inspector can show tools, evidence titles, model tier, and cost. It cannot show prompts, secrets, or chunk bodies.",
  },
  {
    title: "The demo stays alive.",
    body: "Atomic spend reservation and golden replays keep the 90-second path working when live models or budget are unavailable. The header labels Fake, Live, or Recorded.",
  },
  {
    title: "Revisions stay on the same thread.",
    body: "After a plan, Slower pace and Fewer transfers rebuild the itinerary from TripState. Another destination resets only the place and searches again.",
  },
] as const;

const INTERVIEW = [
  ["How do you keep HITL on the same thread?", "src/ai/graph/compile.ts await_destination_choice and await_tradeoff plus Command"],
  ["How do you stop clients from stuffing history?", "app/api/trips/[id]/run/route.ts sends only the new delta"],
  ["How do you expose a graph without leaking prompts?", "src/ai/stream/public-events.ts"],
  ["How do you keep the demo alive?", "src/ai/runtime/budget.ts and src/ai/replay"],
  ["How do you authorize tools?", "src/ai/tools/catalog.ts NODE_TOOL_ALLOWLIST"],
  ["What does CI actually prove?", "docs/evaluation.md and the Vitest suite"],
] as const;

export default function CaseStudyPage() {
  return (
    <div className="min-h-dvh bg-background text-text">
      <header className="flex h-16 items-center justify-between border-b border-border px-5">
        <Link href="/" className="font-display text-sm font-semibold tracking-[0.14em] text-text">
          ROUTE STATE
        </Link>
        <Link
          href="/"
          className="text-sm text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-text"
        >
          Back to planner
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">Case study</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Why the atlas is the graph</h1>
        <p className="mt-4 text-[15px] leading-7 text-muted">
          Route State is a hiring demo. The product is a trip planner. The argument is that LangGraph should
          own durable orchestration, while the UI stream stays on an allowlisted public protocol.
        </p>

        <ol className="mt-8 space-y-4 text-[15px] leading-7">
          {ARGUMENTS.map((item, index) => (
            <li key={item.title} className="rounded-[14px] border border-border bg-surface p-1.5">
              <div className="rounded-[10px] bg-elevated px-5 py-4">
                <p className="font-mono text-[11px] text-accent">{String(index + 1).padStart(2, "0")}</p>
                <p className="mt-2 text-text">
                  <strong>{item.title}</strong> {item.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-14 font-display text-2xl font-semibold tracking-tight">Interview map</h2>
        <dl className="mt-5 space-y-4">
          {INTERVIEW.map(([question, answer]) => (
            <div key={question} className="border-t border-border pt-4">
              <dt className="text-[15px] text-text">{question}</dt>
              <dd className="mt-1 font-mono text-[12px] leading-5 text-muted">{answer}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-14 font-display text-2xl font-semibold tracking-tight">What is fake, and why</h2>
        <p className="mt-4 text-[15px] leading-7 text-muted">
          Default runtime is deterministic. The graph, interrupts, tool allowlist, and public events are real.
          Model calls are not required for the recruiter path. Set the runtime to live to call models, stream
          tokens with the AI SDK, query pgvector, and fetch Open-Meteo weather. The travel corpus is generated
          planning notes, not an authoritative guidebook. Optional scenery uploads store atmosphere only.
          Identity and booking documents are rejected.
        </p>
        <p className="mt-4 text-[15px] leading-7 text-muted">
          CI covers scope, injection, destination fit, interrupt/resume, unauthorized tools, image validation,
          and spend reservation. Optional LLM-as-judge is a manual command, not part of <code>stable</code> CI.
        </p>

        <p className="mt-10">
          <Link href="/replay/family-beach-europe" className="text-accent hover:underline">
            Play the recorded family-beach run
          </Link>
        </p>
      </main>
    </div>
  );
}
