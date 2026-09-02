import Link from "next/link";

export const metadata = {
  title: "Engineering case study · Route State",
};

export default function CaseStudyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">Case study</p>
      <h1 className="mt-3 font-display text-4xl">Why the atlas is the graph</h1>
      <p className="mt-4 text-[15px] leading-7 text-muted">
        Route State is a hiring demo. The product is a trip planner. The argument is that LangGraph
        should own durable orchestration, while the Vercel AI SDK owns the UI stream.
      </p>
      <ol className="mt-8 list-decimal space-y-4 pl-5 text-[15px] leading-7">
        <li>
          <strong>Graph spec is shared.</strong> <code>src/ai/graph/spec.ts</code> feeds the compiled
          graph, the atlas, the LangFlow artifact, and replay fixtures.
        </li>
        <li>
          <strong>Interrupts are first-class.</strong> Destination choice is a dedicated node. Resume
          uses <code>Command</code>, not a fake user message.
        </li>
        <li>
          <strong>Public events are allowlisted.</strong> The inspector can show tools, evidence
          titles, model tier, and cost. It cannot show prompts or chunk bodies.
        </li>
        <li>
          <strong>The demo stays alive.</strong> Atomic spend reservation and golden replays keep the
          90-second path working when live models or budget are unavailable.
        </li>
      </ol>
      <p className="mt-8">
        <Link href="/" className="text-accent">
          Back to the atlas
        </Link>
      </p>
    </main>
  );
}
