import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import { DESTINATIONS, KNOWLEDGE_DOCS, type KnowledgeDoc } from "../data/travel/catalog";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

type GeneratedFile = {
  documents?: KnowledgeDoc[];
};

function loadGeneratedDocs(): KnowledgeDoc[] {
  try {
    const parsed = JSON.parse(readFileSync(resolve(process.cwd(), "data/travel/generated-corpus.json"), "utf8")) as GeneratedFile;
    return parsed.documents ?? [];
  } catch {
    return [];
  }
}

function hashBody(body: string) {
  return createHash("sha256").update(body).digest("hex");
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

async function embedBatches(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  if (!process.env.OPENAI_API_KEY && !process.env.AI_GATEWAY_API_KEY) {
    console.warn("No model credentials; seeding documents without embeddings.");
    return [];
  }
  const { embedTexts } = await import("../src/ai/models/factory");
  const embeddings: number[][] = [];
  const batchSize = 32;
  for (let index = 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize);
    const next = await embedTexts(batch);
    embeddings.push(...next);
    console.log(`Embedded ${Math.min(index + batch.length, texts.length)}/${texts.length}`);
  }
  return embeddings;
}

async function main() {
  const connectionString = process.env.SUPABASE_SESSION_POOLER_DATABASE_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_SESSION_POOLER_DATABASE_URL is required");
  }

  const documents = [...KNOWLEDGE_DOCS, ...loadGeneratedDocs()];
  const unique = new Map<string, KnowledgeDoc>();
  for (const doc of documents) unique.set(doc.id, doc);
  const corpus = [...unique.values()];

  const pool = new Pool({ connectionString, max: 2 });
  try {
    for (const destination of DESTINATIONS) {
      await pool.query(
        `insert into rag.destinations (slug, name, country, region, traits, summary)
         values ($1, $2, $3, $4, $5::jsonb, $6)
         on conflict (slug) do update set
           name = excluded.name,
           summary = excluded.summary,
           traits = excluded.traits`,
        [
          destination.slug,
          destination.name,
          destination.country,
          destination.region,
          JSON.stringify({ ...destination.traits, latitude: destination.latitude, longitude: destination.longitude }),
          destination.summary,
        ],
      );
    }

    for (const doc of corpus) {
      const hash = hashBody(doc.body);
      await pool.query(
        `insert into rag.documents
          (id, destination_slug, title, category, language, source_type, body, content_hash, provenance)
         values ($1, $2, $3, $4, 'en', $5, $6, $7, $8::jsonb)
         on conflict (id) do update set body = excluded.body, content_hash = excluded.content_hash, provenance = excluded.provenance`,
        [
          doc.id,
          doc.destinationSlug,
          doc.title,
          doc.category,
          doc.sourceType,
          doc.body,
          hash,
          JSON.stringify({
            generatedBy: doc.id.startsWith("llm-") ? "generate-corpus" : "seed-corpus",
            synthetic: true,
          }),
        ],
      );
      await pool.query(
        `insert into rag.chunks
          (id, document_id, destination_slug, category, language, title, body, content_hash)
         values ($1, $2, $3, $4, 'en', $5, $6, $7)
         on conflict (id) do update set body = excluded.body, content_hash = excluded.content_hash`,
        [`${doc.id}-chunk`, doc.id, doc.destinationSlug, doc.category, doc.title, doc.body, hash],
      );
    }

    const embeddings = await embedBatches(corpus.map((doc) => `${doc.title}\n\n${doc.body}`));
    if (embeddings.length === corpus.length) {
      for (let index = 0; index < corpus.length; index += 1) {
        const doc = corpus[index];
        const embedding = embeddings[index];
        if (!doc || !embedding) continue;
        const hash = hashBody(doc.body);
        await pool.query(`update rag.chunks set embedding = $2::extensions.vector where id = $1`, [
          `${doc.id}-chunk`,
          toVectorLiteral(embedding),
        ]);
        await pool.query(
          `insert into rag.ingestion_manifest (content_hash, document_id, embedding_model)
           values ($1, $2, $3)
           on conflict (content_hash) do update set embedding_model = excluded.embedding_model, generated_at = now()`,
          [hash, doc.id, process.env.MODEL_EMBEDDING ?? "openai/text-embedding-3-small"],
        );
      }
    }

    console.log(`Seeded ${DESTINATIONS.length} destinations and ${corpus.length} documents`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
