import { createHash } from "node:crypto";
import { Pool } from "pg";
import { DESTINATIONS, KNOWLEDGE_DOCS } from "../data/travel/catalog";

async function main() {
  const connectionString = process.env.SUPABASE_SESSION_POOLER_DATABASE_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_SESSION_POOLER_DATABASE_URL is required");
  }

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
          JSON.stringify(destination.traits),
          destination.summary,
        ],
      );
    }

    for (const doc of KNOWLEDGE_DOCS) {
      const hash = createHash("sha256").update(doc.body).digest("hex");
      await pool.query(
        `insert into rag.documents
          (id, destination_slug, title, category, language, source_type, body, content_hash, provenance)
         values ($1, $2, $3, $4, 'en', $5, $6, $7, $8::jsonb)
         on conflict (id) do update set body = excluded.body, content_hash = excluded.content_hash`,
        [
          doc.id,
          doc.destinationSlug,
          doc.title,
          doc.category,
          doc.sourceType,
          doc.body,
          hash,
          JSON.stringify({ generatedBy: "seed-corpus", synthetic: true }),
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
    console.log(`Seeded ${DESTINATIONS.length} destinations and ${KNOWLEDGE_DOCS.length} documents`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
