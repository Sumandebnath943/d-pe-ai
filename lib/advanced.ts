/**
 * Advanced-mode orchestrator: the best-of-N prompt tournament.
 *
 * Flow: generate N candidate prompts + M synthetic test inputs → run every
 * candidate on every input → an AI judge scores the OUTPUTS → highest wins.
 * Each stage reports progress so the UI can narrate the tournament live.
 */
import { Message, Tournament, CandidateRun } from './types'

const TESTCASE_COUNT = 3

async function call(task: string, payload: Record<string, unknown>): Promise<any> {
  const res = await fetch('/api/advanced', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, ...payload }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Tournament step "${task}" failed.`)
  }
  return res.json()
}

export async function runTournament(
  messages: Message[],
  seedPrompt: string | undefined,
  onUpdate: (patch: Partial<Tournament>) => void
): Promise<Tournament> {
  const tournament: Tournament = {
    status: 'running',
    stage: 'Generating candidate prompts & test cases…',
    testcases: [],
    candidates: [],
    runs: [],
    scores: [],
  }
  onUpdate(tournament)

  // Candidates and test cases are independent — fetch them in parallel.
  const [candRes, tcRes] = await Promise.all([
    call('candidates', { messages, seedPrompt }),
    call('testcases', { messages, count: TESTCASE_COUNT }),
  ])
  const candidates = candRes.candidates ?? []
  const testcases = tcRes.testcases ?? []
  tournament.candidates = candidates
  tournament.testcases = testcases

  if (candidates.length === 0) {
    throw new Error('No candidate prompts could be generated.')
  }

  onUpdate({
    candidates,
    testcases,
    stage: `Running ${candidates.length} candidates against ${testcases.length} test cases…`,
  })

  // Run each candidate against all test inputs (candidates in parallel).
  const runs: CandidateRun[] = await Promise.all(
    candidates.map(async (c: { id: string; prompt: string }) => {
      const { outputs } = await call('run', { prompt: c.prompt, testcases })
      return { candidateId: c.id, outputs: outputs ?? [] }
    })
  )
  tournament.runs = runs
  onUpdate({ runs, stage: 'Judging the outputs…' })

  // Judge scores each candidate's outputs against the user's intent.
  const entries = candidates.map((c: { id: string; label: string }) => ({
    id: c.id,
    label: c.label,
    outputs: runs.find((r) => r.candidateId === c.id)?.outputs ?? [],
  }))
  const judgeRes = await call('judge', { messages, testcases, entries })

  tournament.scores = judgeRes.scores ?? []
  tournament.winnerId = judgeRes.winnerId
  tournament.status = 'done'
  tournament.stage = 'Complete'
  onUpdate({
    scores: tournament.scores,
    winnerId: tournament.winnerId,
    status: 'done',
    stage: 'Complete',
  })

  return tournament
}
