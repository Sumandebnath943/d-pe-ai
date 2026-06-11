/**
 * Local semantic embeddings via transformers.js (all-MiniLM-L6-v2, 384-dim).
 *
 * Runs on the main thread with a lazily dynamic-imported model: the first use
 * downloads ~22MB from the HF hub (cached thereafter). Main-thread (rather than
 * a Web Worker) because Turbopack does not reliably serve the very large
 * transformers.js worker bundle. We batch + yield so the UI can paint progress.
 *
 * Public API is intentionally small and stable: callers (DatasetPanel,
 * PromptForgeApp) only need embedTexts / embedQuery / onModelProgress.
 */

type ProgressEvent = { status?: string; progress?: number }
type Extractor = (
  input: string | string[],
  opts: { pooling: 'mean'; normalize: boolean }
) => Promise<{ tolist: () => number[][] }>

let extractorPromise: Promise<Extractor> | null = null
let modelProgressCb: ((percent: number) => void) | null = null

/** Register a callback for model-download progress (0-100). Pass null to clear. */
export function onModelProgress(cb: ((percent: number) => void) | null) {
  modelProgressCb = cb
}

async function getExtractor(): Promise<Extractor> {
  if (typeof window === 'undefined') {
    throw new Error('Embeddings can only run in the browser.')
  }
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')
      // Always fetch from the hub; never look for bundled local weights.
      env.allowLocalModels = false
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        progress_callback: (x: ProgressEvent) => {
          if (x?.status === 'progress') modelProgressCb?.(Math.round(x.progress ?? 0))
        },
      })
      return extractor as unknown as Extractor
    })()
  }
  return extractorPromise
}

const BATCH = 16

/** Embed a batch of texts into 384-dim normalized vectors (cosine = dot product). */
export async function embedTexts(
  texts: string[],
  onProgress?: (done: number, total: number) => void
): Promise<number[][]> {
  if (texts.length === 0) return []
  const extractor = await getExtractor()
  const vectors: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const sub = texts.slice(i, i + BATCH)
    const output = await extractor(sub, { pooling: 'mean', normalize: true })
    for (const row of output.tolist()) vectors.push(row)
    onProgress?.(Math.min(i + BATCH, texts.length), texts.length)
    // Yield to the event loop so progress can render between batches.
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return vectors
}

/** Convenience: embed a single string (e.g. a search query). */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text])
  return vector
}

/** True once the model has begun loading — i.e. embeddings have been used. */
export function isEmbeddingActive(): boolean {
  return extractorPromise !== null
}
