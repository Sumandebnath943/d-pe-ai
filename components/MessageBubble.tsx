"use client"

interface Props {
  role: 'user' | 'assistant'
  content: string
}

export default function MessageBubble({ role, content }: Props) {
  if (role === 'assistant') {
    return (
      <div className="ws-msg-in" style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '16px 8px',
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
      }}>
        {/* Avatar — a terminal prompt block */}
        <div style={{
          width: '26px', height: '26px',
          background: 'var(--surface)',
          border: '1px solid var(--accent-border)',
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: '2px',
          color: 'var(--accent-soft)',
          fontFamily: 'var(--font-terminal)',
          fontSize: '12px',
          boxShadow: '0 0 12px var(--glow)',
        }}>
          ❯
        </div>

        {/* Content */}
        <div style={{
          fontSize: '15px',
          color: 'var(--text-1)',
          lineHeight: 1.7,
          flex: 1,
        }}>
          {content ? content : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingTop: '8px' }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: 'var(--accent)', display: 'inline-block',
                  animation: `blink 1.2s ease infinite`, animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // User message — right aligned terminal card
  return (
    <div className="ws-msg-in" style={{
      display: 'flex',
      justifyContent: 'flex-end',
      maxWidth: '720px',
      margin: '0 auto',
      padding: '16px 8px',
    }}>
      <div style={{
        maxWidth: '70%',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '12px 12px 4px 12px',
        padding: '10px 16px',
        fontSize: '15px',
        color: 'var(--text-1)',
        lineHeight: 1.6,
        wordBreak: 'break-word',
      }}>{content}</div>
    </div>
  )
}
