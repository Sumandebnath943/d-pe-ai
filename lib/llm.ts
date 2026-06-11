/**
 * LLM provider abstraction — OpenAI primary, Groq fallback.
 *
 * Every server route calls through here instead of instantiating a provider
 * directly. Behaviour:
 *   - If OPENAI_API_KEY is set, OpenAI (gpt-4o-mini) is tried first.
 *   - On ANY OpenAI failure (missing key, auth, rate limit, network), it falls
 *     back to Groq (llama-3.3-70b-versatile) — the previous behaviour.
 *   - If only GROQ_API_KEY is set, it behaves exactly as before.
 *
 * gpt-4o-mini is chosen because it is a drop-in for the existing call shape:
 * it accepts temperature, a token cap, response_format json_object, and
 * streaming identically to Groq, so route behaviour is unchanged — only the
 * provider routing differs.
 */
import OpenAI from 'openai'
import Groq from 'groq-sdk'

export const OPENAI_MODEL = 'gpt-4o-mini'
export const GROQ_MODEL = 'llama-3.3-70b-versatile'

export type LLMRole = 'system' | 'user' | 'assistant'
export interface LLMMessage { role: LLMRole; content: string }

export interface LLMOptions {
  messages: LLMMessage[]
  temperature?: number
  topP?: number
  maxTokens?: number
  /** Request a JSON object response (response_format: { type: 'json_object' }). */
  jsonObject?: boolean
}

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key || key === 'your_openai_api_key_here') return null
  return new OpenAI({ apiKey: key })
}

function getGroq(): Groq | null {
  const key = process.env.GROQ_API_KEY
  if (!key || key === 'your_groq_api_key_here') return null
  return new Groq({ apiKey: key })
}

/** True when at least one provider is configured. */
export function hasLLMProvider(): boolean {
  return !!(getOpenAI() || getGroq())
}

/** Which provider will be tried first — useful for logging/diagnostics. */
export function primaryProvider(): 'openai' | 'groq' | 'none' {
  if (getOpenAI()) return 'openai'
  if (getGroq()) return 'groq'
  return 'none'
}

// Build provider-specific create() params from the unified options. The only
// cross-provider difference is the token-cap field name.
function buildParams(provider: 'openai' | 'groq', opts: LLMOptions, stream: boolean) {
  const params: Record<string, unknown> = {
    model: provider === 'openai' ? OPENAI_MODEL : GROQ_MODEL,
    messages: opts.messages,
    stream,
  }
  if (opts.temperature !== undefined) params.temperature = opts.temperature
  if (opts.topP !== undefined) params.top_p = opts.topP
  if (opts.maxTokens !== undefined) {
    if (provider === 'openai') params.max_completion_tokens = opts.maxTokens
    else params.max_tokens = opts.maxTokens
  }
  if (opts.jsonObject) params.response_format = { type: 'json_object' }
  return params
}

const NO_PROVIDER =
  'No LLM provider configured. Add OPENAI_API_KEY (primary) or GROQ_API_KEY (fallback) to .env.local.'

/**
 * Non-streaming completion. Tries OpenAI, falls back to Groq on any error.
 * Returns the assistant message text.
 */
export async function llmComplete(opts: LLMOptions): Promise<string> {
  const oa = getOpenAI()
  if (oa) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await oa.chat.completions.create(buildParams('openai', opts, false) as any)) as any
      return res.choices?.[0]?.message?.content ?? ''
    } catch (err) {
      console.error('[LLM] OpenAI completion failed, falling back to Groq:', err)
    }
  }
  const gq = getGroq()
  if (!gq) throw new Error(NO_PROVIDER)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = (await gq.chat.completions.create(buildParams('groq', opts, false) as any)) as any
  return res.choices?.[0]?.message?.content ?? ''
}

/**
 * Streaming completion. Tries OpenAI; if the stream fails BEFORE emitting any
 * token, falls back to Groq. (A mid-stream failure is re-thrown — we can't
 * safely restart a half-emitted stream.) Yields text deltas.
 */
export async function* llmStream(opts: LLMOptions): AsyncGenerator<string> {
  const oa = getOpenAI()
  if (oa) {
    let emitted = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = (await oa.chat.completions.create(buildParams('openai', opts, true) as any)) as any
      for await (const chunk of stream) {
        const t = chunk.choices?.[0]?.delta?.content
        if (t) { emitted = true; yield t }
      }
      return
    } catch (err) {
      if (emitted) throw err
      console.error('[LLM] OpenAI stream failed before output, falling back to Groq:', err)
    }
  }
  const gq = getGroq()
  if (!gq) throw new Error(NO_PROVIDER)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = (await gq.chat.completions.create(buildParams('groq', opts, true) as any)) as any
  for await (const chunk of stream) {
    const t = chunk.choices?.[0]?.delta?.content
    if (t) yield t
  }
}
