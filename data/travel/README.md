# Travel corpus

42 European destination profiles, 9 deterministic topic notes each, plus optional LLM-written notes in `generated-corpus.json`.

This is an architecture demonstration, not authoritative travel advice. Provenance stays `sourceType: synthetic`. Live retrieval embeds those notes in `rag.chunks` and searches with pgvector. Weather uses catalog coordinates against Open-Meteo.
