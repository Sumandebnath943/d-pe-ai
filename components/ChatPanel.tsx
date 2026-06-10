"use client"

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader } from 'lucide-react'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import EmptyState from './EmptyState'
import { Message } from '@/lib/types'

interface Props {
  messages: Message[]
  isLoading: boolean
  onSend: (text: string, isReverseEngineer?: boolean) => void
  onStartOver?: () => void
}

export default function ChatPanel({ messages, isLoading, onSend, onStartOver }: Props) {
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
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: '64px',
          paddingBottom: '24px',
          paddingLeft: '32px',
          paddingRight: '32px',
          position: 'relative'
        }}
      >
        {messages.length === 0 && !isLoading && <EmptyState onSend={onSend} />}
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
        <div style={{
          maxWidth: '680px',
          margin: '0 auto',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '10px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          transition: 'border-color 0.2s ease',
        }}
          onFocus={() => {}}
        >
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
              background: canSend ? 'var(--text-1)' : 'var(--border)',
              border: 'none',
              borderRadius: '10px',
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {isLoading
              ? <Loader size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--bg)' }} />
              : <ArrowUp size={16} strokeWidth={2.5} color={canSend ? 'var(--bg)' : 'var(--text-4)'} />
            }
          </button>
        </div>
        <div style={{
          maxWidth: '680px',
          margin: '8px auto 0',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>Enter to send · Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  )
}
