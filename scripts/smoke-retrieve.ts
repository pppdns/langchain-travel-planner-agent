import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const { retrieveEvidence } = await import("../src/ai/retrieval/hybrid");
  const items = await retrieveEvidence({
    text: "family beach neighborhoods with short transfers",
    destinationSlug: "faro",
    live: true,
  });
  console.log(JSON.stringify({ count: items.length, titles: items.map((item) => item.title) }));
  if (!items.length) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
