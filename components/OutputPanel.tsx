"use client"

import { useState, useRef, useEffect } from 'react'
import { Tournament, ResponsibilityReport, QualityReport } from '@/lib/types'

interface Props {
  prompt: string | null
  isGenerating: boolean
  version: number
  onRefine: (text: string) => void
  isLoadingChat: boolean
  tournament?: Tournament
  responsibility?: ResponsibilityReport
  quality?: QualityReport
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

export default function OutputPanel({ prompt, isGenerating, version, onRefine, isLoadingChat, tournament, responsibility, quality }: Props) {
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
      {!prompt && !isGenerating && !tournament && !responsibility && !quality ? (
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
          {quality && <QualityReportView report={quality} />}
          {responsibility && <ResponsibilityReportView report={responsibility} />}
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
// Prompt-quality QA report: self-critique score + auto-improve + complexity tier.
// ---------------------------------------------------------------------------
function QualityReportView({ report }: { report: QualityReport }) {
  const { status, score, level, summary, issues, improved, error } = report

  const scoreColor = score >= 90 ? 'var(--green)' : score >= 70 ? '#d8a657' : '#cc5555'
  const sevColor = (s: string) => (s === 'major' ? '#cc5555' : '#d8a657')
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px' }}>🔬</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Quality Review</span>
        </div>
        {status === 'done' && (
          <span style={{
            fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: '10px',
            color: 'var(--text-2)', background: 'var(--surface-2)',
          }}>{levelLabel} tier</span>
        )}
      </div>

      {status === 'reviewing' ? (
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '10px', height: '10px', borderRadius: '50%',
            border: '2px solid var(--accent)', borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }} />
          <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Auditing prompt quality…</span>
        </div>
      ) : status === 'error' ? (
        <div style={{ padding: '12px 14px', fontSize: '12px', color: '#cc5555' }}>{error || 'Quality review failed.'}</div>
      ) : (
        <div style={{ padding: '12px 14px' }}>
          {/* Score + summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: scoreColor }}>{score}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>/ 100 quality</span>
          </div>
          {summary && (
            <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '10px' }}>{summary}</div>
          )}

          {improved && (
            <div style={{
              fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-light)',
              border: '1px solid var(--accent-border)', borderRadius: '6px',
              padding: '7px 10px', marginBottom: issues.length ? '10px' : 0, lineHeight: 1.5,
            }}>
              The reviewer strengthened the prompt — the version shown below is the improved one.
            </div>
          )}

          {/* Issues (omitted when the prompt is already excellent) */}
          {issues.map((iss, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '8px' }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                background: sevColor(iss.severity), marginTop: '5px',
              }} />
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>{iss.area}</span>
                <span style={{
                  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  marginLeft: '6px', color: sevColor(iss.severity),
                }}>{iss.severity}</span>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5, marginTop: '2px' }}>{iss.note}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Responsible-AI report: constitutional critique + auto-revise verdict.
// ---------------------------------------------------------------------------
function ResponsibilityReportView({ report }: { report: ResponsibilityReport }) {
  const { status, verdict, score, summary, findings, error } = report

  const verdictMeta =
    verdict === 'revised'
      ? { label: 'Revised for safety', color: 'var(--accent)', bg: 'var(--accent-light)' }
      : verdict === 'flagged'
        ? { label: 'Flagged', color: '#cc5555', bg: 'rgba(255,68,68,0.08)' }
        : { label: 'Responsible', color: 'var(--green)', bg: 'var(--green-light)' }

  const statusDot = (s: string) =>
    s === 'fail' ? '#cc5555' : s === 'warn' ? '#d8a657' : 'var(--green)'

  const issues = findings.filter((f) => f.status !== 'pass')
  const passCount = findings.filter((f) => f.status === 'pass').length

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px' }}>🛡️</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Responsibility Review</span>
        </div>
        {status === 'done' && (
          <span style={{
            fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: '10px',
            color: verdictMeta.color, background: verdictMeta.bg,
          }}>{verdictMeta.label}</span>
        )}
      </div>

      {/* Reviewing / error / body */}
      {status === 'reviewing' ? (
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '10px', height: '10px', borderRadius: '50%',
            border: '2px solid var(--accent)', borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }} />
          <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Auditing against the constitution…</span>
        </div>
      ) : status === 'error' ? (
        <div style={{ padding: '12px 14px', fontSize: '12px', color: '#cc5555' }}>{error || 'Review failed.'}</div>
      ) : (
        <div style={{ padding: '12px 14px' }}>
          {/* Score + summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: verdictMeta.color }}>{score}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>/ 100 responsibility</span>
          </div>
          {summary && (
            <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '10px' }}>{summary}</div>
          )}

          {verdict === 'revised' && (
            <div style={{
              fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-light)',
              border: '1px solid var(--accent-border)', borderRadius: '6px',
              padding: '7px 10px', marginBottom: '10px', lineHeight: 1.5,
            }}>
              A breach was found, so the prompt shown below is the auto-revised safe version.
            </div>
          )}

          {/* Rule check summary */}
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: issues.length ? '8px' : 0 }}>
            {passCount}/{findings.length} rules passed
          </div>

          {/* Only surface non-passing rules to keep it focused */}
          {issues.map((f) => (
            <div key={f.ruleId} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '8px' }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                background: statusDot(f.status), marginTop: '5px',
              }} />
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)' }}>{f.ruleTitle}</span>
                <span style={{
                  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  marginLeft: '6px', color: statusDot(f.status),
                }}>{f.status}</span>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5, marginTop: '2px' }}>{f.note}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
