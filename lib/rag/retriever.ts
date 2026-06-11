/**
 * BM25 Retrieval Engine — zero-dependency, runs entirely in-browser.
 *
 * Implements the Okapi BM25 ranking algorithm for scoring document relevance
 * against a query. This is the same algorithm used by Elasticsearch and Lucene.
 */

import { Chunk } from '../types';

// BM25 tuning parameters
const K1 = 1.5;  // Term frequency saturation
const B = 0.75;  // Length normalization

// Simple stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'and', 'but', 'or', 'if', 'while', 'because', 'until', 'although',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you',
  'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them',
  'their', 'what', 'which', 'who', 'whom',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

interface DocEntry {
  chunk: Chunk;
  tokens: string[];
  termFreqs: Map<string, number>;
}

export interface BM25Index {
  docs: DocEntry[];
  avgDocLength: number;
  docCount: number;
  /** Maps term -> set of doc indices that contain it */
  invertedIndex: Map<string, Set<number>>;
}

/**
 * Build a BM25 index from an array of chunks.
 */
export function buildIndex(chunks: Chunk[]): BM25Index {
  const docs: DocEntry[] = [];
  const invertedIndex = new Map<string, Set<number>>();
  let totalTokens = 0;

  for (let i = 0; i < chunks.length; i++) {
    const tokens = tokenize(chunks[i].text);
    totalTokens += tokens.length;

    const termFreqs = new Map<string, number>();
    for (const token of tokens) {
      termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
    }

    docs.push({ chunk: chunks[i], tokens, termFreqs });

    // Update inverted index
    for (const term of termFreqs.keys()) {
      if (!invertedIndex.has(term)) {
        invertedIndex.set(term, new Set());
      }
      invertedIndex.get(term)!.add(i);
    }
  }

  return {
    docs,
    avgDocLength: chunks.length > 0 ? totalTokens / chunks.length : 0,
    docCount: chunks.length,
    invertedIndex,
  };
}

/** Optional predicate to restrict retrieval to a subset of chunks (e.g. selected datasets). */
export type ChunkFilter = (chunk: Chunk) => boolean;

/**
 * Search the BM25 index for the most relevant chunks given a query.
 * Returns up to `topK` results sorted by relevance score (descending).
 * An optional `filter` restricts results to matching chunks (metadata filtering).
 */
export function search(
  index: BM25Index,
  query: string,
  topK: number = 5,
  filter?: ChunkFilter
): { chunk: Chunk; score: number }[] {
  if (index.docCount === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scores = new Float64Array(index.docCount);

  for (const qTerm of queryTokens) {
    const postings = index.invertedIndex.get(qTerm);
    if (!postings) continue;

    // IDF: log((N - n + 0.5) / (n + 0.5) + 1)
    const n = postings.size;
    const idf = Math.log((index.docCount - n + 0.5) / (n + 0.5) + 1);

    for (const docIdx of postings) {
      const doc = index.docs[docIdx];
      const tf = doc.termFreqs.get(qTerm) || 0;
      const docLen = doc.tokens.length;

      // BM25 term score
      const tfNorm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (docLen / index.avgDocLength)));
      scores[docIdx] += idf * tfNorm;
    }
  }

  // Get top K results
  const results: { chunk: Chunk; score: number }[] = [];
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > 0 && (!filter || filter(index.docs[i].chunk))) {
      results.push({ chunk: index.docs[i].chunk, score: scores[i] });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

// ---------------------------------------------------------------------------
// Hybrid retrieval — fuses lexical (BM25) and semantic (vector) rankings.
// ---------------------------------------------------------------------------

/** Dot product. Vectors are L2-normalized at embed time, so this equals cosine similarity. */
function dot(a: number[], b: number[]): number {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) sum += a[i] * b[i];
  return sum;
}

export interface HybridIndex {
  bm25: BM25Index;
  /** Only chunks that actually carry an embedding participate in vector search. */
  vectors: { chunk: Chunk; vec: number[] }[];
}

/** Build a combined index: BM25 over all chunks + a vector list over embedded chunks. */
export function buildHybridIndex(chunks: Chunk[]): HybridIndex {
  return {
    bm25: buildIndex(chunks),
    vectors: chunks
      .filter((c) => c.embedding && c.embedding.length > 0)
      .map((c) => ({ chunk: c, vec: c.embedding as number[] })),
  };
}

/**
 * Hybrid search via Reciprocal Rank Fusion (RRF).
 *
 * Each retriever produces a ranked candidate pool; an item's fused score is the
 * sum of 1/(K + rank) across the rankers it appears in. RRF needs no score
 * normalization and gracefully degrades to BM25-only when no query vector is
 * available (e.g. the embedding model hasn't loaded, or no chunks are embedded).
 */
export function searchHybrid(
  index: HybridIndex,
  query: string,
  queryVec: number[] | undefined,
  topK: number = 5,
  filter?: ChunkFilter
): { chunk: Chunk; score: number }[] {
  const K = 60; // standard RRF damping constant
  const POOL = Math.max(topK * 4, 20);
  const chunkById = new Map<string, Chunk>();

  // Lexical ranking (already sorted best-first).
  const bmRank = new Map<string, number>();
  const bm = search(index.bm25, query, POOL, filter);
  bm.forEach((r, i) => {
    bmRank.set(r.chunk.id, i);
    chunkById.set(r.chunk.id, r.chunk);
  });

  // Semantic ranking (cosine similarity).
  const vecRank = new Map<string, number>();
  if (queryVec && queryVec.length > 0 && index.vectors.length > 0) {
    const scored = index.vectors
      .filter((v) => !filter || filter(v.chunk))
      .map((v) => ({ chunk: v.chunk, score: dot(queryVec, v.vec) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, POOL);
    scored.forEach((r, i) => {
      vecRank.set(r.chunk.id, i);
      chunkById.set(r.chunk.id, r.chunk);
    });
  }

  if (chunkById.size === 0) return [];

  const fused: { chunk: Chunk; score: number }[] = [];
  for (const [id, chunk] of chunkById) {
    let score = 0;
    if (bmRank.has(id)) score += 1 / (K + bmRank.get(id)!);
    if (vecRank.has(id)) score += 1 / (K + vecRank.get(id)!);
    fused.push({ chunk, score });
  }
  fused.sort((a, b) => b.score - a.score);
  return fused.slice(0, topK);
}

/**
 * Reciprocal Rank Fusion across several independent ranked lists.
 *
 * Used by advanced retrieval to merge the hits from multiple query variants
 * (multi-query + HyDE): an item's fused score is the sum of 1/(K + rank) over
 * every list it appears in, so chunks that surface for several reformulations
 * rise to the top. Deduplicates by chunk id.
 */
export function rrfFuse(
  lists: { chunk: Chunk }[][],
  topK: number = 10,
  K: number = 60
): { chunk: Chunk; score: number }[] {
  const chunkById = new Map<string, Chunk>();
  const scoreById = new Map<string, number>();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const id = item.chunk.id;
      chunkById.set(id, item.chunk);
      scoreById.set(id, (scoreById.get(id) ?? 0) + 1 / (K + rank));
    });
  }
  const fused = Array.from(chunkById.entries()).map(([id, chunk]) => ({
    chunk,
    score: scoreById.get(id) ?? 0,
  }));
  fused.sort((a, b) => b.score - a.score);
  return fused.slice(0, topK);
}

/**
 * Format retrieved chunks into a context block for the system prompt.
 */
export function formatRagContext(results: { chunk: Chunk; score: number }[]): string {
  if (results.length === 0) return '';

  let block = '## REFERENCE MATERIAL\nThe following excerpts are from the user\'s uploaded datasets. Use them as additional context when relevant to the conversation:\n\n';
  for (let i = 0; i < results.length; i++) {
    block += `--- Excerpt ${i + 1} (relevance: ${results[i].score.toFixed(2)}) ---\n`;
    block += results[i].chunk.text + '\n\n';
  }
  return block;
}
