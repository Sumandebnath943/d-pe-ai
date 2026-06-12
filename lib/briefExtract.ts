/**
 * Brief extraction — distill a completed interview transcript into a compact,
 * structured PromptBrief. The generation step consumes this brief instead of the
 * full 9-turn conversation, cutting generation input from ~10k tokens to <1k.
 *
 * Server-only: uses llmComplete (the "callLLM" non-streaming helper) from
 * lib/llm, which holds the provider SDK credentials. The browser reaches it via
 * the /api/brief route, never directly.
 */
import { llmComplete } from './llm'

export interface PromptBrief {
  task: string // what the final prompt needs to accomplish
  domain: string // field, industry, or subject area
  persona: string // the AI identity/role to adopt
  audience: string // who the AI will be talking to
  tone: string // voice, style, formality
  constraints: string[] // rules, limits, things to avoid
  context: string // background knowledge the AI needs
  examples: string[] // example interactions if provided
  outputFormat: string // expected structure of responses
  complexity: 'basic' | 'standard' | 'complex' // from promptSpec tiers
}

const SYSTEM_PROMPT = `You are extracting structured requirements from an interview transcript. Read the conversation and populate every field of the JSON structure below. Be complete — do not leave any field empty. If a field was not discussed, make a reasonable inference from context. Respond ONLY with a single valid JSON object. No preamble. No markdown. No code fences.

Note: the interview used a 4-turn grouped format, so each turn covered multiple pillars at once. Extract each pillar individually regardless of how they were grouped in the conversation — do not miss a field just because it was discussed alongside others.

Capture the SPECIFIC value the user actually mentioned, not a generic description. If they said "sarcastic and direct", capture "sarcastic and direct", not "casual". Use their exact persona, audience, domain, constraints, and examples — never flatten them into vague words like "professional", "helpful", or "general purpose".

Required JSON structure:
{
  "task": string,            // what the final prompt needs to accomplish
  "domain": string,          // field, industry, or subject area
  "persona": string,         // the AI identity/role to adopt
  "audience": string,        // who the AI will be talking to
  "tone": string,            // voice, style, formality
  "constraints": string[],   // rules, limits, things to avoid
  "context": string,         // background knowledge the AI needs
  "examples": string[],      // example interactions if provided (else [])
  "outputFormat": string,    // expected structure of responses
  "complexity": "basic" | "standard" | "complex"
}

For complexity: basic if the task is simple and focused; standard if it requires moderate depth; complex if it needs maximum depth, edge case handling, and multi-dimensional reasoning.`

function asString(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  if (v == null) return ''
  return String(v).trim()
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(asString).filter((s) => s.length > 0)
  if (typeof v === 'string' && v.trim().length > 0) return [v.trim()]
  return []
}

function asComplexity(v: unknown): PromptBrief['complexity'] {
  return v === 'basic' || v === 'complex' ? v : 'standard'
}

/**
 * Distill the interview into a PromptBrief. Throws "Brief extraction failed" on
 * an unparseable model response so the caller can fall back to the full-history
 * generation path.
 */
export async function extractBrief(
  conversationHistory: Array<{ role: string; content: string }>
): Promise<PromptBrief> {
  const transcript = conversationHistory
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => `${m.role === 'assistant' ? 'INTERVIEWER' : 'USER'}: ${m.content.trim()}`)
    .join('\n\n')

  const raw =
    (await llmComplete({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `INTERVIEW TRANSCRIPT:\n${transcript}\n\nReturn the brief as JSON.` },
      ],
      temperature: 0.2,
      maxTokens: 800,
      jsonObject: true,
    })) || ''

  // Strip an accidental ```json fence, then JSON.parse. Any failure throws.
  let text = raw.trim()
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) text = fence[1].trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Brief extraction failed')
  }

  return {
    task: asString(parsed.task),
    domain: asString(parsed.domain),
    persona: asString(parsed.persona),
    audience: asString(parsed.audience),
    tone: asString(parsed.tone),
    constraints: asStringArray(parsed.constraints),
    context: asString(parsed.context),
    examples: asStringArray(parsed.examples),
    outputFormat: asString(parsed.outputFormat),
    complexity: asComplexity(parsed.complexity),
  }
}
