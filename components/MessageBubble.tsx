"use client"

interface Props {
  role: 'user' | 'assistant'
  content: string
}

export default function MessageBubble({ role, content }: Props) {
  if (role === 'assistant') {
    return (
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '16px 8px',
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
        animation: 'fadeIn 0.2s ease',
      }}>
        {/* Avatar */}
        <div style={{
          width: '26px', height: '26px',
          background: 'var(--accent)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: '2px',
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h8M2 12h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
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
                  background: 'var(--text-4)', display: 'inline-block',
                  animation: `blink 1.2s ease infinite`, animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // User message — right aligned, subtle bubble
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      maxWidth: '720px',
      margin: '0 auto',
      padding: '16px 8px',
      animation: 'fadeIn 0.15s ease',
    }}>
      <div style={{
        maxWidth: '70%',
        background: 'var(--surface-2)',
        borderRadius: '18px',
        padding: '10px 16px',
        fontSize: '15px',
        color: 'var(--text-1)',
        lineHeight: 1.6,
        wordBreak: 'break-word',
      }}>{content}</div>
    </div>
  )
}
