/**
 * Client helper for the Responsible-AI review. Sends the final prompt to the
 * constitutional critique endpoint and returns a structured report (and a
 * safe rewrite when a breach was found).
 */
import { ResponsibilityReport } from './types'

export async function runResponsibleReview(prompt: string): Promise<ResponsibilityReport> {
  const res = await fetch('/api/responsible', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Responsible review failed.')
  }
  return res.json()
}
