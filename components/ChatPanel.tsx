"use client"

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader } from 'lucide-react'
import MessageBubble from './MessageBubble'
import EmptyState from './EmptyState'
import { Message } from '@/lib/types'

interface Props {
  messages: Message[]
  isLoading: boolean
  onSend: (text: string, isReverseEngineer?: boolean) => void
  onStartOver?: () => void
  // True while a grouped interview is in progress (messages exist, no prompt yet).
  interviewActive?: boolean
}

// The four themed interview turns, in order — drives the progress indicator.
const INTERVIEW_GROUPS = ['Task + domain', 'Who + voice', 'Rules + edge cases', 'Examples + format']

export default function ChatPanel({ messages, isLoading, onSend, onStartOver, interviewActive }: Props) {
  const [input, setInput] = useState('')
  const [isReverseEngineer, setIsReverseEngineer] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isAtBottomRef = useRef(true)

  useEffect(() => { textareaRef.current?.focus() }, [])

  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSend(input.trim(), isReverseEngineer)
    setInput('')
    setIsReverseEngineer(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  const canSend = input.trim().length > 0 && !isLoading

  // Best-effort interview step (1–4). The model drives the real turn order, so
  // this estimates the current group from the number of questions asked, capped
  // at 4. Within-turn follow-ups may advance it early — it's a guide, not exact.
  const assistantTurns = messages.filter((m) => m.role === 'assistant' && m.content.trim().length > 0).length
  const step = Math.min(Math.max(assistantTurns, 1), 4)
  const showStepper = !!interviewActive && messages.length > 0

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg)'
    }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="ws-grid"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: '64px',
          paddingBottom: '24px',
          paddingLeft: '24px',
          paddingRight: '24px',
          position: 'relative'
        }}
      >
        {messages.length === 0 && !isLoading && <EmptyState onSend={onSend} />}

        {showStepper && (
          <div style={{ maxWidth: '680px', margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Interview · step {step} of 4
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-soft)' }}>
                {INTERVIEW_GROUPS[step - 1]}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '2px',
                    background: i < step ? 'var(--accent)' : 'var(--border)',
                    transition: 'background 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 24px 12px',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px', maxWidth: '680px', margin: '0 auto 8px auto', width: '100%' }}>
          <button
            onClick={() => setIsReverseEngineer(!isReverseEngineer)}
            style={{
              background: isReverseEngineer ? 'var(--accent-light)' : 'transparent',
              color: isReverseEngineer ? 'var(--accent)' : 'var(--text-3)',
              border: `1px solid ${isReverseEngineer ? 'var(--accent-border)' : 'transparent'}`,
              borderRadius: '20px',
              padding: '4px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            {isReverseEngineer ? 'Reverse Engineer Mode ON' : 'Reverse Engineer'}
          </button>
        </div>
        <div className="ws-focus-glow" style={{
          maxWidth: '680px',
          margin: '0 auto',
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '10px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
          onFocus={() => {}}
        >
          {/* Shell prompt glyph */}
          <span aria-hidden style={{
            fontFamily: 'var(--font-terminal)',
            color: 'var(--accent-soft)',
            fontSize: '14px',
            lineHeight: '24px',
            flexShrink: 0,
            textShadow: '0 0 10px var(--glow)',
          }}>❯</span>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to create?"
            maxLength={2000}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '15px',
              color: 'var(--text-1)',
              lineHeight: '1.5',
              minHeight: '24px',
              maxHeight: '140px',
              overflowY: 'auto',
              padding: '2px 0',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: '32px',
              height: '32px',
              background: canSend ? 'var(--accent)' : 'var(--border)',
              boxShadow: canSend ? '0 0 16px var(--glow)' : 'none',
              border: 'none',
              borderRadius: '8px',
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {isLoading
              ? <Loader size={14} style={{ animation: 'spin 1s linear infinite', color: '#04260f' }} />
              : <ArrowUp size={16} strokeWidth={2.5} color={canSend ? '#04260f' : 'var(--text-4)'} />
            }
          </button>
        </div>
        <div style={{
          maxWidth: '680px',
          margin: '8px auto 0',
          textAlign: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-4)' }}>enter to send · shift+enter for newline</span>
        </div>
      </div>
    </div>
  )
}
