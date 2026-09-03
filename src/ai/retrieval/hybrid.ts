import { searchKnowledge } from "@/src/ai/graph/rank";
import type { EvidenceRef } from "@/src/ai/graph/state";
import { getRagPool, toVectorLiteral } from "@/src/ai/db/pool";
import { embedQuery } from "@/src/ai/models/factory";

export type RetrievalQuery = {
  text: string;
  destinationSlug?: string;
  category?: string;
  live?: boolean;
};

type ChunkRow = {
  id: string;
  title: string;
  destination_slug: string;
  category: string;
  source_type: EvidenceRef["sourceType"] | string;
};

function toEvidence(doc: {
  id: string;
  title: string;
  sourceType: string;
  destinationSlug?: string;
  category?: string;
}): EvidenceRef {
  const sourceType =
    doc.sourceType === "wikivoyage" || doc.sourceType === "official" || doc.sourceType === "user"
      ? doc.sourceType
      : "synthetic";
  return {
    id: doc.id,
    title: doc.title,
    sourceType,
    destinationSlug: doc.destinationSlug,
    category: doc.category,
  };
}

export function retrieveCatalogEvidence(query: RetrievalQuery): EvidenceRef[] {
  return searchKnowledge(query.text, query.destinationSlug)
    .filter((doc) => (query.category ? doc.category === query.category : true))
    .map((doc) =>
      toEvidence({
        id: doc.id,
        title: doc.title,
        sourceType: doc.sourceType,
        destinationSlug: doc.destinationSlug,
        category: doc.category,
      }),
    );
}

export async function retrieveEvidence(query: RetrievalQuery): Promise<EvidenceRef[]> {
  const fallback = retrieveCatalogEvidence(query);
  if (!query.live) return fallback;

  const pool = getRagPool();
  if (!pool) return fallback;

  try {
    const embedding = await embedQuery(query.text);
    if (!embedding) return fallback;
    const { rows } = await pool.query<ChunkRow>(
      `select c.id, c.title, c.destination_slug, c.category, d.source_type
         from rag.chunks c
         join rag.documents d on d.id = c.document_id
        where c.published
          and d.published
          and c.embedding is not null
          and ($2::text is null or c.destination_slug = $2)
          and ($3::text is null or c.category = $3)
        order by c.embedding <=> $1::extensions.vector
        limit 8`,
      [toVectorLiteral(embedding), query.destinationSlug ?? null, query.category ?? null],
    );
    if (!rows.length) return fallback;
    return rows.map((row) =>
      toEvidence({
        id: row.id,
        title: row.title,
        sourceType: row.source_type,
        destinationSlug: row.destination_slug,
        category: row.category,
      }),
    );
  } catch {
    return fallback;
  }
}
