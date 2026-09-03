import Link from "next/link";

export const metadata = {
  title: "Engineering case study · Route State",
};

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
          Route State is a hiring demo. The product is a trip planner. The argument is that LangGraph
          should own durable orchestration, while the Vercel AI SDK owns the UI stream.
        </p>
        <ol className="mt-8 space-y-4 text-[15px] leading-7">
          {[
            {
              title: "Graph spec is shared.",
              body: (
                <>
                  <code>src/ai/graph/spec.ts</code> feeds the compiled graph, the atlas, the LangFlow
                  artifact, and replay fixtures.
                </>
              ),
            },
            {
              title: "Interrupts are first-class.",
              body: (
                <>
                  Destination choice is a dedicated node. Resume uses <code>Command</code>, not a fake
                  user message.
                </>
              ),
            },
            {
              title: "Public events are allowlisted.",
              body: "The inspector can show tools, evidence titles, model tier, and cost. It cannot show prompts or chunk bodies.",
            },
            {
              title: "The demo stays alive.",
              body: "Atomic spend reservation and golden replays keep the 90-second path working when live models or budget are unavailable.",
            },
          ].map((item, index) => (
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
      </main>
    </div>
  );
}
