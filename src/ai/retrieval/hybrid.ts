import { searchKnowledge } from "@/src/ai/graph/rank";
import type { EvidenceRef } from "@/src/ai/graph/state";

export type RetrievalQuery = {
  text: string;
  destinationSlug?: string;
  category?: string;
};

export function retrieveEvidence(query: RetrievalQuery) {
  return searchKnowledge(query.text, query.destinationSlug)
    .filter((doc) => (query.category ? doc.category === query.category : true))
    .map(
      (doc): EvidenceRef => ({
        id: doc.id,
        title: doc.title,
        sourceType: doc.sourceType,
        destinationSlug: doc.destinationSlug,
        category: doc.category,
      }),
    );
}
