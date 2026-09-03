import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { DESTINATIONS } from "../data/travel/catalog";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

const TOPICS = [
  "neighborhoods",
  "food",
  "family",
  "beach",
  "pace",
  "transfers",
  "budget",
  "weather",
  "evenings",
  "getting-around",
  "where-to-stay",
  "day-trips",
] as const;

const documentSchema = z.object({
  category: z.string(),
  title: z.string(),
  body: z.string().min(180),
});

const payloadSchema = z.object({
  documents: z.array(documentSchema).min(8),
});

export type GeneratedDocument = {
  id: string;
  destinationSlug: string;
  title: string;
  category: string;
  body: string;
  sourceType: "synthetic";
};

type CorpusFile = {
  generatedAt: string;
  model: string;
  documents: GeneratedDocument[];
};

const OUTPUT = resolve(process.cwd(), "data/travel/generated-corpus.json");

function readExisting(): CorpusFile {
  try {
    return JSON.parse(readFileSync(OUTPUT, "utf8")) as CorpusFile;
  } catch {
    return { generatedAt: new Date().toISOString(), model: "", documents: [] };
  }
}

async function generateForDestination(slug: string, name: string, country: string, summary: string) {
  const { generateStructured } = await import("../src/ai/models/factory");
  const result = await generateStructured({
    tier: "fast",
    schema: payloadSchema,
    timeoutMs: 45_000,
    system:
      "You write grounded travel-planning notes for a European city catalog. No em-dashes. No live prices, opening hours, or hotel names that can go stale. Be specific to the city. 180-320 words per document.",
    prompt: `Write one document per category: ${TOPICS.join(", ")}.
City: ${name} (${slug}), ${country}.
Catalog summary: ${summary}.
Each document needs category, title, and body. Titles should look like "${name} neighborhoods".`,
  });
  if (!result) return [];
  return result.output.documents
    .filter((doc) => (TOPICS as readonly string[]).includes(doc.category))
    .map(
      (doc): GeneratedDocument => ({
        id: `llm-${slug}-${doc.category}`,
        destinationSlug: slug,
        title: doc.title,
        category: doc.category,
        body: doc.body,
        sourceType: "synthetic",
      }),
    );
}

async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function main() {
  const existing = readExisting();
  const have = new Set(existing.documents.map((doc) => doc.destinationSlug));
  const missing = DESTINATIONS.filter((destination) => !have.has(destination.slug));
  console.log(`Corpus already has ${existing.documents.length} docs. Generating ${missing.length} destinations.`);

  const generated: GeneratedDocument[] = [...existing.documents];
  await mapPool(missing, 3, async (destination) => {
    const docs = await generateForDestination(
      destination.slug,
      destination.name,
      destination.country,
      destination.summary,
    );
    if (!docs.length) {
      console.warn(`No documents generated for ${destination.slug}`);
      return [];
    }
    generated.push(...docs);
    writeFileSync(
      OUTPUT,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          model: process.env.MODEL_FAST ?? "openai/gpt-5.6-luna",
          documents: generated,
        } satisfies CorpusFile,
        null,
        2,
      ),
    );
    console.log(`Wrote ${docs.length} docs for ${destination.slug} (total ${generated.length})`);
    return docs;
  });

  console.log(`Done. ${generated.length} generated documents at ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
