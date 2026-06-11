/**
 * Advanced retrieval pipeline (used in Advanced mode).
 *
 * Plain hybrid search (Normal mode) does one query → BM25+vector → RRF. This
 * upgrades that with the modern retrieval stack:
 *
 *   1. Query expansion — multi-query reformulations + a HyDE hypothetical
 *      passage, so we match relevant text the user didn't phrase exactly.
 *   2. Multi-query hybrid search — every reformulation runs through the same
 *      BM25 + vector hybrid retriever.
 *   3. RRF fusion — chunks that surface across several reformulations rise.
 *   4. LLM re-ranking — a judge scores the fused candidates on the ORIGINAL
 *      query and reorders them, sharpening precision before injection.
 *
 * Each Groq-backed step (1 and 4) degrades gracefully: if it fails, the
 * pipeline falls back to the next-best result rather than erroring.
 */
import { Chunk } from '../types'
import { HybridIndex, searchHybrid, rrfFuse, ChunkFilter } from './retriever'
import { embedTexts } from './embeddings'

const FUSE_POOL = 12 // candidates kept after fusion, handed to the re-ranker

interface ExpandResult {
  variants: string[]
  hyde: string
}

async function expandQuery(query: string): Promise<ExpandResult> {
  try {
    const res = await fetch('/api/retrieval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'expand', query, count: 3 }),
    })
    if (!res.ok) throw new Error('expand failed')
    const data = await res.json()
    return { variants: data.variants ?? [], hyde: data.hyde ?? '' }
  } catch (err) {
    console.error('[RAG/advanced] Query expansion failed, using original query only:', err)
    return { variants: [], hyde: '' }
  }
}

async function rerank(
  query: string,
  candidates: { chunk: Chunk }[]
): Promise<{ chunk: Chunk }[]> {
  try {
    const res = await fetch('/api/retrieval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'rerank',
        query,
        candidates: candidates.map((c) => ({ id: c.chunk.id, text: c.chunk.text })),
      }),
    })
    if (!res.ok) throw new Error('rerank failed')
    const { ranking } = (await res.json()) as { ranking: { id: string; score: number }[] }
    if (!ranking || ranking.length === 0) return candidates
    const byId = new Map(candidates.map((c) => [c.chunk.id, c]))
    const ordered = ranking.map((r) => byId.get(r.id)).filter(Boolean) as { chunk: Chunk }[]
    // Append any candidate the judge omitted, preserving fusion order.
    for (const c of candidates) if (!ranking.some((r) => r.id === c.chunk.id)) ordered.push(c)
    return ordered
  } catch (err) {
    console.error('[RAG/advanced] Re-rank failed, using fused order:', err)
    return candidates
  }
}

/**
 * Run the full advanced retrieval pipeline. Returns the final top-`topK`
 * chunks (re-ranked), or [] if nothing matched.
 */
export async function retrieveAdvanced(
  index: HybridIndex,
  query: string,
  topK: number = 5,
  filter?: ChunkFilter
): Promise<{ chunk: Chunk; score: number }[]> {
  // 1. Expand the query.
  const { variants, hyde } = await expandQuery(query)
  const queries = [query, ...variants]
  const searchTexts = hyde ? [...queries, hyde] : queries

  // 2. Embed every query text (best-effort — vectors enrich, BM25 still works without).
  let vectors: number[][] = []
  try {
    vectors = await embedTexts(searchTexts)
  } catch (err) {
    console.error('[RAG/advanced] Query embedding failed, keyword-only multi-query:', err)
  }

  // 3. Hybrid search per query text, then fuse the ranked lists with RRF.
  const lists = searchTexts.map((text, i) =>
    searchHybrid(index, text, vectors[i], FUSE_POOL, filter)
  )
  const fused = rrfFuse(lists, FUSE_POOL)
  if (fused.length === 0) return []

  // 4. Re-rank the fused candidates against the ORIGINAL query, keep top-K.
  const reranked = await rerank(query, fused)
  return reranked.slice(0, topK).map((c, i) => ({ chunk: c.chunk, score: 1 - i / topK }))
}
