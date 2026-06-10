interface Props {
  onSend?: (text: string) => void
}

export default function EmptyState({ onSend }: Props) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        {/* Sun icon */}
        <div style={{ marginBottom: '20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent)' }}>
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: '32px',
          fontWeight: 400,
          color: 'var(--text-1)',
          marginBottom: '10px',
          letterSpacing: '-0.02em',
        }}>
          What can I help you build?
        </h1>

        <p style={{
          fontSize: '15px',
          color: 'var(--text-3)',
          lineHeight: 1.6,
          marginBottom: '32px'
        }}>
          Describe what you need a prompt for, or paste an example.<br />I'll interview you and craft it.
        </p>

        {onSend && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '300px', margin: '0 auto' }}>
            <button
              onClick={() => onSend('I want to build a new prompt. Please grill me with questions one by one to extract the perfect context.')}
              style={{
                padding: '12px 16px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-2)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              Interactive "Grill Me" Interview
            </button>
            <button
              onClick={() => onSend('I need a quick prompt for a coding task.')}
              style={{
                padding: '12px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-3)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              Start basic coding prompt
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
