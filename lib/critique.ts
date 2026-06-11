/**
 * Client helper for the prompt-quality QA pass. Sends the generated prompt to
 * the critique endpoint and returns a structured report (and a strengthened
 * rewrite when the reviewer can improve it).
 */
import { QualityReport } from './types'

export async function runQualityCritique(prompt: string): Promise<QualityReport> {
  const res = await fetch('/api/critique', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Quality review failed.')
  }
  return res.json()
}
