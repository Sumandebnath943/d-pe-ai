"use client"

import { useState, useRef, useEffect } from 'react'
import { Tournament } from '@/lib/types'
import { REWRITE_THRESHOLD, type ReviewResult } from '@/lib/review'
import { CONSTITUTION } from '@/lib/constitution'

interface Props {
  prompt: string | null
  isGenerating: boolean
  version: number
  onRefine: (text: string) => void
  isLoadingChat: boolean
  tournament?: Tournament
  review?: ReviewResult
  reviewStatus?: 'reviewing' | 'done' | 'error'
  reviewError?: string
}

function parsePrompt(text: string) {
  const lines = text.split('\n')
  const sections: { title: string; body: string }[] = []
  let current: { title: string; lines: string[] } = { title: '', lines: [] }
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current.title || current.lines.length > 0) {
        sections.push({ title: current.title, body: current.lines.join('\n').trim() })
      }
      const raw = line.slice(3).trim()
      const title = raw.replace(/\p{Emoji_Presentation}/gu, '').replace(/\p{Emoji}/gu, '').trim()
      current = { title, lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  if (current.title || current.lines.length > 0) {
    sections.push({ title: current.title, body: current.lines.join('\n').trim() })
  }
  return sections
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function getTimestamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
}

export default function OutputPanel({ prompt, isGenerating, version, onRefine, isLoadingChat, tournament, review, reviewStatus, reviewError }: Props) {
  const hasReview = reviewStatus === 'reviewing' || reviewStatus === 'error' || !!review
  const [copyState, setCopyState] = useState<'idle'|'copied'>('idle')
  const [shareState, setShareState] = useState<'idle'|'copied'>('idle')
  const [refineInput, setRefineInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prompt && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [prompt])

  const handleCopy = () => {
    if (!prompt) return
    navigator.clipboard.writeText(prompt)
    setCopyState('copied')
    setTimeout(() => setCopyState('idle'), 2000)
  }

  const handleDownload = (ext: 'txt' | 'md') => {
    if (!prompt) return
    const blob = new Blob([prompt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `d-pe-ai-${getTimestamp()}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = () => {
    if (!prompt) return
    const encoded = btoa(encodeURIComponent(prompt))
    const url = `${window.location.origin}?p=${encoded}`
    navigator.clipboard.writeText(url)
    setShareState('copied')
    setTimeout(() => setShareState('idle'), 2000)
  }

  const handleRefine = () => {
    const text = refineInput.trim()
    if (!text || isLoadingChat) return
    onRefine(text)
    setRefineInput('')
  }

  const sections = prompt ? parsePrompt(prompt) : []
  const words = prompt ? wordCount(prompt) : 0

  return (
    <div style={{
      width: '100%',
      flexShrink: 0,
      borderLeft: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header — editor-tab chrome */}
      <div style={{
        height: '52px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
        background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'flex', gap: '5px' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f56' }} />
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ffbd2e' }} />
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#27c93f' }} />
          </span>
          <span style={{ fontFamily: 'var(--font-terminal)', fontSize: '12.5px', color: 'var(--text-1)' }}>
            output<span style={{ color: 'var(--text-3)' }}>.md</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {version > 1 && (
            <span style={{
              background: 'var(--surface-2)', color: 'var(--text-2)',
              padding: '2px 8px', borderRadius: '10px',
              fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500
            }}>v{version}</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className={prompt && !isGenerating ? 'ws-live-dot' : undefined} style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: isGenerating ? 'var(--amber)' : prompt ? 'var(--green)' : 'var(--text-4)',
              animation: isGenerating ? 'pulse 1s ease infinite' : 'none'
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isGenerating ? 'Generating' : prompt ? 'Ready' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Scanning sweep while the engine writes */}
      {isGenerating && <div className="ws-scan" style={{ zIndex: 5 }} />}

      {/* Content */}
      {!prompt && !isGenerating && !tournament && !hasReview ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px', gap: '16px'
        }}>
          <div style={{ fontFamily: 'var(--font-terminal)', fontSize: '13px', color: 'var(--text-4)' }}>
            // waiting for output<span className="ws-caret" style={{ color: 'var(--text-4)' }}>▮</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-4)', lineHeight: 1.6, maxWidth: '240px', margin: '0 auto' }}>
              Complete the interview in the chat and your prompt compiles here.
            </div>
          </div>
        </div>
      ) : (
        <div ref={scrollRef} style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '28px 24px 16px'
        }}>
          {tournament && <TournamentView tournament={tournament} />}
          {hasReview && <ReviewView review={review} status={reviewStatus} error={reviewError} />}
          {sections.map((section, i) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              {section.title && (
                <div style={{
                  fontFamily: 'var(--font-terminal)',
                  fontSize: '12px', fontWeight: 600, color: 'var(--accent-soft)',
                  letterSpacing: '0.03em', marginBottom: '6px',
                  textTransform: 'uppercase',
                }}>
                  <span style={{ color: 'var(--text-4)' }}>## </span>{section.title}
                </div>
              )}
              <div style={{
                fontSize: '13px', color: 'var(--text-1)', lineHeight: '1.8',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{section.body}</div>
            </div>
          ))}
          {words > 0 && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-4)',
              textAlign: 'right',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)'
            }}>{words.toLocaleString()} words</div>
          )}
        </div>
      )}

      {/* Actions */}
      {prompt && (
        <>
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 20px',
            display: 'flex', gap: '6px', flexShrink: 0,
          }}>
            {[
              { label: copyState === 'copied' ? 'Copied' : 'Copy', action: handleCopy, success: copyState === 'copied' },
              { label: 'TXT', action: () => handleDownload('txt'), success: false },
              { label: 'MD', action: () => handleDownload('md'), success: false },
              { label: shareState === 'copied' ? 'Linked' : 'Share', action: handleShare, success: shareState === 'copied' },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action} style={{
                flex: 1, padding: '7px 0',
                color: btn.success ? 'var(--green)' : 'var(--text-3)',
                background: 'none', border: 'none', borderRadius: '6px',
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
                onMouseEnter={e => { if (!btn.success) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)' } }}
                onMouseLeave={e => { if (!btn.success) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)' } }}
              >{btn.label}</button>
            ))}
          </div>

          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '16px 20px 0',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '4px' }}>
              <span style={{ color: 'var(--accent)' }}>$</span> one-click frameworks
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: '🌳 Tree of Thoughts', prompt: 'Apply the "Tree of Thoughts (ToT)" macro-architecture to this prompt. Force it to explicitly branch into multiple reasoning paths, evaluate them, and synthesize the best one.' },
                { label: '🎭 Expert Panel', prompt: 'Apply the "Expert Panel" macro-architecture to this prompt. Transform it into a simulation where 3 distinct experts debate the problem before outputting a final answer.' },
                { label: '🔁 Auto-Eval Loop', prompt: 'Apply the "Auto-Eval Loop" macro-architecture to this prompt. Inject a strict self-critique loop where it generates a draft, critiques it against the objective, and outputs a refined final version.' },
                { label: '🧑‍🏫 Socratic Coach', prompt: 'Apply the "Socratic Coach" macro-architecture to this prompt. Flip the prompt so it acts as a tutor that asks guided questions rather than answering directly.' }
              ].map(fw => (
                <button
                  key={fw.label}
                  onClick={() => {
                    if (!isLoadingChat) onRefine(fw.prompt);
                  }}
                  disabled={isLoadingChat}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    color: 'var(--text-2)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: isLoadingChat ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: isLoadingChat ? 0.5 : 1
                  }}
                  onMouseEnter={e => { if (!isLoadingChat) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-strong)' } }}
                  onMouseLeave={e => { if (!isLoadingChat) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)' } }}
                >
                  {fw.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            padding: '16px 20px',
            display: 'flex',
            gap: '8px',
            flexShrink: 0
          }}>
            <input
              type="text"
              value={refineInput}
              onChange={e => setRefineInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRefine() }}
              placeholder="❯ refine this prompt…"
              style={{
                flex: 1,
                height: '40px',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '0 12px',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                color: 'var(--text-1)',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-light)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            <button
              onClick={handleRefine}
              disabled={!refineInput.trim() || isLoadingChat}
              style={{
                padding: '0 20px',
                height: '40px',
                color: refineInput.trim() && !isLoadingChat ? 'white' : 'var(--text-4)',
                background: refineInput.trim() && !isLoadingChat ? 'var(--accent)' : 'var(--border)',
                border: 'none',
                borderRadius: '6px',
                cursor: refineInput.trim() && !isLoadingChat ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: 500
              }}
            >Refine</button>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Advanced-mode tournament scoreboard.
// ---------------------------------------------------------------------------
function TournamentView({ tournament }: { tournament: Tournament }) {
  const { status, stage, candidates, testcases, scores, winnerId, error } = tournament
  const scoreById = new Map(scores.map((s) => [s.candidateId, s]))
  const ordered =
    status === 'done'
      ? [...candidates].sort(
          (a, b) => (scoreById.get(b.id)?.score ?? 0) - (scoreById.get(a.id)?.score ?? 0)
        )
      : candidates

  return (
    <div style={{
      marginBottom: '22px',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ fontSize: '13px' }}>⚔️</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Best-of-N Tournament</span>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '2px 8px', borderRadius: '10px',
          color: status === 'done' ? 'var(--green)' : status === 'error' ? '#cc5555' : 'var(--accent)',
          background: status === 'done' ? 'var(--green-light)' : status === 'error' ? 'rgba(255,68,68,0.08)' : 'var(--accent-light)',
        }}>
          {status === 'done' ? 'Winner' : status === 'error' ? 'Failed' : 'Running'}
        </span>
      </div>

      {/* Stage line */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {status === 'running' && (
          <span style={{
            width: '10px', height: '10px', borderRadius: '50%',
            border: '2px solid var(--accent)', borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }} />
        )}
        <span style={{ fontSize: '12px', color: status === 'error' ? '#cc5555' : 'var(--text-2)' }}>
          {status === 'error' ? (error || 'Tournament failed.') : stage}
        </span>
      </div>

      {/* Meta */}
      {(candidates.length > 0 || testcases.length > 0) && (
        <div style={{
          padding: '0 14px 10px', fontSize: '11px', color: 'var(--text-3)',
          fontFamily: 'var(--font-mono)',
        }}>
          {candidates.length} candidate{candidates.length === 1 ? '' : 's'} · {testcases.length} auto-generated test case{testcases.length === 1 ? '' : 's'}
        </div>
      )}

      {/* Scoreboard */}
      {ordered.length > 0 && (
        <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ordered.map((c) => {
            const sc = scoreById.get(c.id)
            const isWinner = status === 'done' && c.id === winnerId
            return (
              <div key={c.id} style={{
                border: `1px solid ${isWinner ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                background: isWinner ? 'var(--accent-light)' : 'var(--bg)',
                borderRadius: '8px', padding: '9px 11px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    {isWinner && <span style={{ fontSize: '12px' }}>👑</span>}
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{c.label}</span>
                  </div>
                  {sc ? (
                    <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isWinner ? 'var(--accent)' : 'var(--text-2)' }}>{sc.score}</span>
                  ) : status === 'running' ? (
                    <span style={{ fontSize: '10px', color: 'var(--text-4)' }}>…</span>
                  ) : null}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px', lineHeight: 1.5 }}>{c.strategy}</div>
                {/* Score bar */}
                {sc && (
                  <div style={{ marginTop: '7px', height: '4px', background: 'var(--surface-2)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${sc.score}%`, height: '100%',
                      background: isWinner ? 'var(--accent)' : 'var(--text-4)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                )}
                {sc?.reasoning && (
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '6px', lineHeight: 1.5, fontStyle: 'italic' }}>
                    {sc.reasoning}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Unified review: engineering quality + constitutional responsibility in two
// cards (kept visually separate per spec), with a single verdict line beneath.
// ---------------------------------------------------------------------------
function ReviewView({
  review,
  status,
  error,
}: {
  review?: ReviewResult
  status?: 'reviewing' | 'done' | 'error'
  error?: string
}) {
  const cardShell = {
    marginBottom: '22px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    overflow: 'hidden',
    background: 'var(--surface)',
  } as const

  const cardHeader = (emoji: string, title: string) => (
    <div
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '13px' }}>{emoji}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{title}</span>
    </div>
  )

  const spinner = (
    <span
      style={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        border: '2px solid var(--accent)',
        borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
      }}
    />
  )

  // Reviewing — single shell with a spinner (both axes are evaluated in one call).
  if (status === 'reviewing') {
    return (
      <div style={cardShell}>
        {cardHeader('🔍', 'Review')}
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {spinner}
          <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
            Auditing quality &amp; constitution…
          </span>
        </div>
      </div>
    )
  }

  // Error — or no result to render.
  if (status === 'error' || !review) {
    return (
      <div style={cardShell}>
        {cardHeader('🔍', 'Review')}
        <div style={{ padding: '12px 14px', fontSize: '12px', color: '#cc5555' }}>
          {error || 'Review failed.'}
        </div>
      </div>
    )
  }

  const { qualityScore, qualityIssues, constitutionViolations, rewrite, rewriteSkipped, verdict } = review
  const scoreColor =
    qualityScore >= 80 ? 'var(--green)' : qualityScore >= 60 ? '#d8a657' : '#cc5555'

  return (
    <>
      {/* QUALITY CARD */}
      <div style={cardShell}>
        {cardHeader('🔬', 'Quality Review')}
        <div style={{ padding: '12px 14px' }}>
          {/* Big colour-coded score + a ✓ when it cleared the threshold */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: scoreColor, lineHeight: 1 }}>
              {qualityScore}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>/ 100 quality</span>
            {rewriteSkipped && (
              <span style={{ marginLeft: '2px', fontSize: '15px', fontWeight: 700, color: 'var(--green)' }}>✓</span>
            )}
          </div>

          {/* Threshold status line — why a rewrite did or didn't fire */}
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              lineHeight: 1.5,
              marginBottom: '10px',
              color: rewriteSkipped ? 'var(--green)' : '#d8a657',
            }}
          >
            {rewriteSkipped
              ? `Passed threshold (≥ ${REWRITE_THRESHOLD}) — no rewrite needed`
              : qualityScore < REWRITE_THRESHOLD
                ? `Below threshold (< ${REWRITE_THRESHOLD}) — rewrite generated`
                : `Above threshold, but a rule violation triggered a rewrite`}
          </div>

          {/* Issues / notes list */}
          {qualityIssues.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: '2px' }}>
                {rewriteSkipped ? 'Minor notes' : 'Issues found'}
              </div>
              {qualityIssues.map((iss, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: '#d8a657', marginTop: '5px' }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5, minWidth: 0 }}>{iss}</div>
                </div>
              ))}
            </>
          )}

          {/* Rewrite box — only when a rewrite was generated (never when skipped) */}
          {!rewriteSkipped &&
            (rewrite ? (
              <div style={{ marginTop: qualityIssues.length ? '14px' : '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: '5px' }}>
                  Rewrite generated
                </div>
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-2)',
                    background: 'var(--bg)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: '6px',
                    padding: '10px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {rewrite}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: '4px' }}>
                  This rewrite is the version now shown in the prompt below.
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: qualityIssues.length ? '12px' : '4px',
                  fontSize: '11px',
                  color: 'var(--text-3)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  lineHeight: 1.5,
                }}
              >
                No rewrite was produced — see the issues and rule violations.
              </div>
            ))}
        </div>
      </div>

      {/* RESPONSIBILITY CARD */}
      <div style={cardShell}>
        {cardHeader('🛡️', 'Responsibility Review')}
        <div style={{ padding: '12px 14px' }}>
          {constitutionViolations.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--green)' }}>
              <span style={{ fontSize: '13px' }}>✓</span>
              All {CONSTITUTION.length} constitutional rules passed
            </div>
          ) : (
            <>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#cc5555', marginBottom: '8px' }}>
                {constitutionViolations.length} rule{constitutionViolations.length === 1 ? '' : 's'} violated
              </div>
              {constitutionViolations.map((rule, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: i === 0 ? 0 : '8px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: '#cc5555', marginTop: '5px' }} />
                  <div style={{ fontSize: '12px', color: '#cc5555', lineHeight: 1.5, minWidth: 0, fontWeight: 600 }}>{rule}</div>
                </div>
              ))}
              <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5 }}>
                A rewrite was generated to address these violations, regardless of the quality score.
              </div>
            </>
          )}
        </div>
      </div>

      {/* SINGLE VERDICT LINE beneath both cards */}
      {verdict && (
        <div
          style={{
            marginTop: '-10px',
            marginBottom: '22px',
            fontSize: '12px',
            color: 'var(--text-3)',
            fontStyle: 'italic',
            lineHeight: 1.6,
            padding: '0 2px',
          }}
        >
          {verdict}
        </div>
      )}
    </>
  )
}
