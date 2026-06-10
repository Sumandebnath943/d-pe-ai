"use client"

import { useState, useRef, useEffect } from 'react'

interface Props {
  prompt: string | null
  isGenerating: boolean
  version: number
  onRefine: (text: string) => void
  isLoadingChat: boolean
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

export default function OutputPanel({ prompt, isGenerating, version, onRefine, isLoadingChat }: Props) {
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
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        height: '52px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-1)' }}>Output</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {version > 1 && (
            <span style={{
              background: 'var(--surface-2)', color: 'var(--text-2)',
              padding: '2px 8px', borderRadius: '10px',
              fontSize: '11px', fontWeight: 500
            }}>v{version}</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: isGenerating ? 'var(--accent)' : prompt ? 'var(--green)' : 'var(--text-4)',
              animation: isGenerating ? 'pulse 1s ease infinite' : 'none'
            }} />
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {isGenerating ? 'Generating...' : prompt ? 'Ready' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {!prompt && !isGenerating ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px', gap: '16px'
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-4)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '6px' }}>Waiting for output</div>
            <div style={{ fontSize: '13px', color: 'var(--text-4)', lineHeight: 1.6, maxWidth: '240px', margin: '0 auto' }}>
              Complete the interview process in the chat to generate your prompt.
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
          {sections.map((section, i) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              {section.title && (
                <div style={{
                  fontSize: '12px', fontWeight: 600, color: 'var(--text-3)',
                  letterSpacing: '0.02em', marginBottom: '6px',
                  textTransform: 'uppercase',
                }}>{section.title}</div>
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
                fontSize: '12px', fontWeight: 500,
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
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '4px' }}>
              One-Click Frameworks
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
              placeholder="Refine this prompt..."
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
