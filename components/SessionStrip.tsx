"use client"
import { Session } from '@/lib/types'

interface Props {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
}

export default function SessionStrip({ sessions, activeSessionId, onSelectSession, onNewSession, onDeleteSession }: Props) {
  return (
    <div className="session-strip" style={{
      height: '40px',
      background: 'var(--surface-2)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      gap: '8px',
      overflowX: 'auto',
      flexShrink: 0
    }}>
      <style>{`
        .session-strip::-webkit-scrollbar { display: none; }
        .session-pill:hover { background: var(--border-subtle) !important; color: var(--text-1) !important; }
        .pill-delete { opacity: 0; transition: opacity 0.15s; }
        .session-pill:hover .pill-delete { opacity: 1; }
      `}</style>

      {sessions.slice(0, 20).map(s => {
        const isActive = s.id === activeSessionId
        return (
          <div
            key={s.id}
            className="session-pill"
            onClick={() => onSelectSession(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '2px 8px 2px 12px',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              background: isActive ? 'var(--bg)' : 'transparent',
              color: isActive ? 'var(--text-1)' : 'var(--text-3)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: isActive ? 500 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s'
            }}
          >
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.title?.slice(0, 24) || 'UNTITLED'}
            </span>
            {s.generatedPrompt && (
              <span style={{
                width: '4px', height: '4px',
                background: 'var(--green)',
                boxShadow: '0 0 6px var(--green)',
                flexShrink: 0
              }} />
            )}
            <button
              className="pill-delete"
              onClick={e => { e.stopPropagation(); onDeleteSession(s.id) }}
              style={{
                width: '16px', height: '16px',
                background: 'none', border: 'none',
                color: 'var(--accent)', cursor: 'pointer',
                fontSize: '14px', lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, flexShrink: 0
              }}
            >×</button>
          </div>
        )
      })}

      <button
        onClick={onNewSession}
        className="label-mono"
        style={{
          marginLeft: 'auto',
          padding: '2px 8px',
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-3)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'all 0.15s'
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-border)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
        }}
      >[+] NEW</button>
    </div>
  )
}
