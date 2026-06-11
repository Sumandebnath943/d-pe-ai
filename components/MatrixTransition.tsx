"use client"
import { useEffect, useRef } from 'react'

/**
 * "Glitch in the matrix" hand-off between the landing console and the workspace.
 * A full-screen green digital-rain wash with a brief RGB-split glitch line, which
 * fades to black at the end so the app can materialize underneath.
 */
export default function MatrixTransition({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const fontSize = 16
    let cols = 0
    let drops: number[] = []

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(window.innerWidth / fontSize)
      drops = new Array(cols).fill(0).map(() => Math.random() * -40)
    }
    resize()

    const chars = 'アカサタナハマヤラワabcdef0123456789{}<>$#@*/\\|=+'
    const pick = () => chars[(Math.random() * chars.length) | 0]

    const DURATION = 1500
    const start = performance.now()
    let raf = 0

    const draw = (t: number) => {
      const elapsed = t - start
      const W = window.innerWidth
      const H = window.innerHeight

      // Trailing fade leaves the classic comet tails.
      ctx.fillStyle = 'rgba(1,4,9,0.16)'
      ctx.fillRect(0, 0, W, H)
      ctx.font = `${fontSize}px var(--font-terminal), monospace`

      for (let i = 0; i < cols; i++) {
        const x = i * fontSize
        const y = drops[i] * fontSize
        // bright leading glyph
        ctx.fillStyle = '#caffd4'
        ctx.fillText(pick(), x, y)
        // green trail glyph just above
        ctx.fillStyle = 'rgba(63,185,80,0.6)'
        ctx.fillText(pick(), x, y - fontSize)

        if (y > H && Math.random() > 0.975) drops[i] = Math.random() * -20
        drops[i] += 1
      }

      // Fade to black across the final third to reveal the workspace.
      if (elapsed > DURATION * 0.66) {
        const k = (elapsed - DURATION * 0.66) / (DURATION * 0.34)
        ctx.fillStyle = `rgba(1,4,9,${Math.min(k, 1)})`
        ctx.fillRect(0, 0, W, H)
      }

      if (elapsed < DURATION) {
        raf = requestAnimationFrame(draw)
      } else if (!doneRef.current) {
        doneRef.current = true
        onComplete()
      }
    }

    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [onComplete])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#010409', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div
        style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          fontFamily: "var(--font-terminal), 'JetBrains Mono', monospace",
        }}
      >
        <div
          className="dpe-glitch"
          style={{
            fontSize: 'clamp(13px, 2vw, 18px)',
            letterSpacing: '0.18em',
            color: '#7ee787',
            textShadow: '2px 0 #f85149, -2px 0 #58a6ff, 0 0 18px rgba(126,231,135,0.6)',
            textTransform: 'uppercase',
          }}
        >
          decrypting workspace<span className="dpe-cursor">_</span>
        </div>
      </div>
    </div>
  )
}
