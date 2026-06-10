export default function TypingIndicator() {
  return (
    <div style={{
      maxWidth: '640px',
      margin: '0 auto 24px auto',
      padding: '0 48px',
      animation: 'fadeUp 0.2s ease forwards'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: '24px', height: '24px',
          background: 'var(--accent)',
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M3 4h10M3 8h10M3 12h6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="13" cy="12" r="2" fill="white"/>
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingTop: '6px' }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: '5px', height: '5px',
              borderRadius: '50%',
              background: 'var(--text-3)',
              display: 'inline-block',
              animation: `blink 1.2s ease infinite`,
              animationDelay: `${i * 0.2}s`
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}
