import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const { generatePlainText, embedQuery } = await import("../src/ai/models/factory");
  const text = await generatePlainText({
    tier: "fast",
    system: "Reply with one word.",
    prompt: "Say ok",
    timeoutMs: 20_000,
  });
  const embedding = await embedQuery("Faro family beach neighborhoods");
  console.log(JSON.stringify({ text, embeddingDims: embedding?.length ?? 0 }));
  if (!text || !embedding?.length) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
