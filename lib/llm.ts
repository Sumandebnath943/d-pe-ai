/**
 * LLM provider abstraction — provider chosen by LLM_PROVIDER, with fallback.
 *
 * Every server route calls through here instead of instantiating a provider
 * directly. Provider routing (see providerOrder):
 *   - LLM_PROVIDER=openai → OpenAI (default model gpt-4o-mini) is tried first.
 *   - LLM_PROVIDER=groq   → Groq (llama-3.3-70b-versatile) is tried first.
 *   - LLM_PROVIDER unset  → OpenAI first if OPENAI_API_KEY is set, else Groq.
 *   The other configured provider is used as an automatic fallback on error.
 *   So switching providers is a single env-var change (LLM_PROVIDER).
 *
 * The OpenAI model is read from OPENAI_MODEL (default gpt-4o-mini). gpt-4o-mini
 * is a drop-in for the existing call shape: it accepts temperature, a token cap,
 * response_format json_object, and streaming identically to Groq, so route
 * behaviour is unchanged — only the provider routing differs.
 *
 * Note: OpenAI prompt-caching is automatic (no cache_control parameter); the
 * Anthropic-style cache_control field is intentionally NOT used here.
 */
import OpenAI from 'openai'
import Groq from 'groq-sdk'

/** OpenAI model id, overridable via OPENAI_MODEL env (defaults to gpt-4o-mini). */
export function openAIModel(): string {
  return process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
}
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

type Provider = 'openai' | 'groq'

/** The set of providers that actually have a usable key. */
function configuredProviders(): Set<Provider> {
  const s = new Set<Provider>()
  if (getOpenAI()) s.add('openai')
  if (getGroq()) s.add('groq')
  return s
}

/**
 * Ordered list of providers to attempt: the LLM_PROVIDER choice first, the other
 * configured provider as fallback. When LLM_PROVIDER is unset we default to
 * OpenAI-first (if its key is present), preserving the previous behaviour.
 * Only providers that are actually configured are included.
 */
function providerOrder(): Provider[] {
  const configured = configuredProviders()
  const pref = process.env.LLM_PROVIDER?.trim().toLowerCase()
  let primary: Provider
  if (pref === 'groq') primary = 'groq'
  else if (pref === 'openai') primary = 'openai'
  else primary = configured.has('openai') ? 'openai' : 'groq'
  const secondary: Provider = primary === 'openai' ? 'groq' : 'openai'
  return [primary, secondary].filter((p) => configured.has(p))
}

/** Which provider will be tried first — useful for logging/diagnostics. */
export function primaryProvider(): Provider | 'none' {
  return providerOrder()[0] ?? 'none'
}

// Build provider-specific create() params from the unified options. The only
// cross-provider difference is the token-cap field name.
function buildParams(provider: Provider, opts: LLMOptions, stream: boolean) {
  const params: Record<string, unknown> = {
    model: provider === 'openai' ? openAIModel() : GROQ_MODEL,
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

/** The configured SDK client for a provider, or null if it has no key. */
function clientFor(provider: Provider): OpenAI | Groq | null {
  return provider === 'openai' ? getOpenAI() : getGroq()
}

/**
 * Non-streaming completion. Tries providers in providerOrder() (LLM_PROVIDER
 * choice first), falling back to the next on any error. Returns the assistant
 * message text.
 */
export async function llmComplete(opts: LLMOptions): Promise<string> {
  const order = providerOrder()
  if (order.length === 0) throw new Error(NO_PROVIDER)
  let lastErr: unknown
  for (let i = 0; i < order.length; i++) {
    const provider = order[i]
    const client = clientFor(provider)
    if (!client) continue
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await (client as any).chat.completions.create(buildParams(provider, opts, false))) as any
      return res.choices?.[0]?.message?.content ?? ''
    } catch (err) {
      lastErr = err
      if (i === order.length - 1) throw err
      console.error(`[LLM] ${provider} completion failed, falling back to ${order[i + 1]}:`, err)
    }
  }
  throw lastErr ?? new Error(NO_PROVIDER)
}

/**
 * Streaming completion. Tries providers in providerOrder(); if a stream fails
 * BEFORE emitting any token, falls back to the next provider. (A mid-stream
 * failure is re-thrown — we can't safely restart a half-emitted stream.)
 * Yields text deltas.
 */
export async function* llmStream(opts: LLMOptions): AsyncGenerator<string> {
  const order = providerOrder()
  if (order.length === 0) throw new Error(NO_PROVIDER)
  for (let i = 0; i < order.length; i++) {
    const provider = order[i]
    const client = clientFor(provider)
    if (!client) continue
    let emitted = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = (await (client as any).chat.completions.create(buildParams(provider, opts, true))) as any
      for await (const chunk of stream) {
        const t = chunk.choices?.[0]?.delta?.content
        if (t) { emitted = true; yield t }
      }
      return
    } catch (err) {
      if (emitted || i === order.length - 1) throw err
      console.error(`[LLM] ${provider} stream failed before output, falling back to ${order[i + 1]}:`, err)
    }
  }
}
