/**
 * Unified review types + response parsing.
 *
 * The single /api/review endpoint folds the old quality-critique and
 * constitutional-responsibility passes into ONE model call. This module holds
 * the shared result shape, the rewrite threshold, and a tolerant parser that
 * degrades gracefully when the model returns malformed or fenced JSON.
 *
 * Kept dependency-free on purpose so lib/types.ts can import `ReviewResult`
 * without creating an import cycle.
 */

export interface ReviewResult {
  qualityScore: number // 0–100
  qualityIssues: string[] // specific issues found, can be empty
  constitutionViolations: string[] // which rules were violated, can be empty
  rewrite: string | null // improved version, or null if not needed
  rewriteSkipped: boolean // true when score >= threshold and no violations
  verdict: string // 1–2 sentence plain English summary
}

/** At/above this quality score, with no constitution violations, no rewrite is produced. */
export const REWRITE_THRESHOLD = 80

/** Safe default returned when the model response can't be parsed at all. */
function failedResult(): ReviewResult {
  return {
    qualityScore: 0,
    qualityIssues: ['Review parsing failed'],
    constitutionViolations: [],
    rewrite: null,
    rewriteSkipped: false,
    verdict: 'The review could not be parsed from the model response.',
  }
}

function clampScore(v: unknown): number {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'string' ? x : String(x ?? '')))
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Parse the raw model output into a ReviewResult.
 * - Strips a leading/trailing markdown code fence if the model added one.
 * - Falls back to extracting the first {...} block if the whole string isn't JSON.
 * - On total failure, returns a safe default so the UI still renders.
 * - Normalizes rewrite/rewriteSkipped so they stay mutually consistent.
 */
export function parseReviewResponse(raw: string): ReviewResult {
  if (!raw || typeof raw !== 'string') return failedResult()

  // Strip a ```json ... ``` (or ``` ... ```) fence if present.
  let text = raw.trim()
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) text = fence[1].trim()

  let obj: unknown
  try {
    obj = JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return failedResult()
    try {
      obj = JSON.parse(m[0])
    } catch {
      return failedResult()
    }
  }

  if (!obj || typeof obj !== 'object') return failedResult()
  const o = obj as Record<string, unknown>

  const qualityScore = clampScore(o.qualityScore)
  const qualityIssues = toStringArray(o.qualityIssues)
  const constitutionViolations = toStringArray(o.constitutionViolations)
  const verdict = typeof o.verdict === 'string' ? o.verdict.trim() : ''

  let rewrite =
    typeof o.rewrite === 'string' && o.rewrite.trim().length > 0 ? o.rewrite.trim() : null

  // rewriteSkipped is a DERIVED invariant, not a model opinion: a prompt only
  // skips the rewrite when it clears the quality threshold AND breaches no rule.
  // The model can contradict itself (e.g. list violations yet set
  // rewriteSkipped: true), so we compute it from the data instead of trusting it.
  const rewriteSkipped = qualityScore >= REWRITE_THRESHOLD && constitutionViolations.length === 0
  if (rewriteSkipped) rewrite = null

  return { qualityScore, qualityIssues, constitutionViolations, rewrite, rewriteSkipped, verdict }
}
