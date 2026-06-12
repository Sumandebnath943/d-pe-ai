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
      minHeight: '100%',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '520px' }}>
        {/* Session prompt line */}
        <div style={{
          fontFamily: 'var(--font-terminal)',
          fontSize: '13px',
          color: 'var(--accent)',
          marginBottom: '22px',
          textShadow: '0 0 16px var(--glow)',
        }}>
          $ d-pe --interview<span className="ws-caret" style={{ color: 'var(--accent-soft)', marginLeft: 4 }}>▮</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-terminal)',
          fontSize: 'clamp(22px, 4vw, 28px)',
          fontWeight: 600,
          color: 'var(--text-1)',
          marginBottom: '12px',
          letterSpacing: '-0.01em',
        }}>
          What can I help you build?
        </h1>

        <p style={{
          fontSize: '14px',
          color: 'var(--text-3)',
          lineHeight: 1.7,
          marginBottom: '32px'
        }}>
          Describe what you need a prompt for, or paste an example.<br />I&apos;ll interview you and craft it.
        </p>

        {onSend && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '340px', margin: '0 auto' }}>
            <button
              onClick={() => onSend('I want to build a new prompt. Please grill me with questions one by one to extract the perfect context.')}
              style={{
                padding: '12px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-2)',
                fontFamily: 'var(--font-terminal)',
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-border)'
                e.currentTarget.style.color = 'var(--text-1)'
                e.currentTarget.style.boxShadow = '0 0 20px var(--glow)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-2)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ color: 'var(--accent-soft)' }}>❯</span>
              grill-me --interactive
              <span style={{ marginLeft: 'auto', color: 'var(--text-4)', fontSize: '11px' }}>the full interview</span>
            </button>
            <button
              onClick={() => onSend('I need a quick prompt for a coding task.')}
              style={{
                padding: '12px 16px',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-terminal)',
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
            >
              <span style={{ color: 'var(--text-4)' }}>❯</span>
              quick-prompt --coding
              <span style={{ marginLeft: 'auto', color: 'var(--text-4)', fontSize: '11px' }}>fast lane</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
