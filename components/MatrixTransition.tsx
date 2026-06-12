"use client"
import { useEffect, useRef, useState } from 'react'

/**
 * "Glitch in the matrix" hand-off between the landing console and the workspace.
 *
 * Sequence (~2.4s):
 *  1. RAIN     — torrential digital rain accelerating hard, with horizontal
 *                glitch-band displacement and full-frame shakes.
 *  2. COLLAPSE — the whole frame squashes into a white-hot horizontal line,
 *                like a CRT being switched off.
 *  3. DOT      — the line shrinks to a phosphor dot and dies; the dark
 *                workspace boots underneath.
 */
const RAIN_END = 1500
const COLLAPSE_END = 2050
const DOT_END = 2350

const DECRYPT_TEXT = 'DECRYPTING WORKSPACE'
const SCRAMBLE_CHARS = 'アカサタナハマヤラワ01<>$#@*/\\=+'

export default function MatrixTransition({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(false)
  const [label, setLabel] = useState('')
  const [labelVisible, setLabelVisible] = useState(true)

  // Scramble-text: random glyphs resolve into the phrase, left to right.
  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => {
      const t = performance.now() - start
      const resolved = Math.floor((t / 1100) * DECRYPT_TEXT.length)
      let out = ''
      for (let i = 0; i < DECRYPT_TEXT.length; i++) {
        if (DECRYPT_TEXT[i] === ' ') { out += ' '; continue }
        out += i < resolved
          ? DECRYPT_TEXT[i]
          : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]
      }
      setLabel(out)
      if (t > RAIN_END - 150) { setLabelVisible(false); clearInterval(id) }
    }, 40)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const fontSize = window.innerWidth < 768 ? 14 : 16
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

    // Snapshot buffer for the CRT collapse.
    const snap = document.createElement('canvas')
    const snapCtx = snap.getContext('2d')!
    let snapped = false

    const start = performance.now()
    let raf = 0
    let nextGlitch = 250

    const draw = (t: number) => {
      const elapsed = t - start
      const W = window.innerWidth
      const H = window.innerHeight

      if (elapsed < RAIN_END) {
        // ---- Phase 1: accelerating rain ----
        ctx.fillStyle = 'rgba(1,4,9,0.16)'
        ctx.fillRect(0, 0, W, H)
        ctx.font = `${fontSize}px var(--font-terminal), monospace`

        const speed = 1 + (elapsed / RAIN_END) * 3.2 // ramps to ~4x
        for (let i = 0; i < cols; i++) {
          const x = i * fontSize
          const y = drops[i] * fontSize
          ctx.fillStyle = '#caffd4'
          ctx.fillText(pick(), x, y)
          ctx.fillStyle = 'rgba(63,185,80,0.6)'
          ctx.fillText(pick(), x, y - fontSize)
          if (y > H && Math.random() > 0.96) drops[i] = Math.random() * -16
          drops[i] += speed
        }

        // Glitch bands: shear random horizontal slices of the frame.
        if (elapsed > nextGlitch) {
          nextGlitch = elapsed + 90 + Math.random() * 140
          const bands = 2 + ((Math.random() * 3) | 0)
          for (let b = 0; b < bands; b++) {
            const by = Math.random() * H
            const bh = 6 + Math.random() * 26
            const dx = (Math.random() - 0.5) * 70 * (0.4 + elapsed / RAIN_END)
            ctx.drawImage(canvas, 0, by * dpr, W * dpr, bh * dpr, dx, by, W, bh)
          }
          // Occasional RGB-split echo of the whole frame.
          if (Math.random() > 0.55) {
            ctx.save()
            ctx.globalAlpha = 0.18
            ctx.globalCompositeOperation = 'screen'
            ctx.drawImage(canvas, (Math.random() - 0.5) * 18, 0, W, H)
            ctx.restore()
          }
        }
      } else if (elapsed < COLLAPSE_END) {
        // ---- Phase 2: CRT power-off — squash the frame into a line ----
        if (!snapped) {
          snapped = true
          snap.width = canvas.width
          snap.height = canvas.height
          snapCtx.drawImage(canvas, 0, 0)
        }
        const k = (elapsed - RAIN_END) / (COLLAPSE_END - RAIN_END) // 0 → 1
        const ease = 1 - Math.pow(1 - k, 3)
        const sh = Math.max(H * (1 - ease), 3)
        const sy = (H - sh) / 2

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = '#010409'
        ctx.fillRect(0, 0, W, H)
        ctx.save()
        // Brightness climbs as the frame compresses.
        ctx.filter = `brightness(${1 + ease * 2.4}) saturate(${1 + ease})`
        ctx.drawImage(snap, 0, sy, W, sh)
        ctx.restore()
        // The hot line at the heart of the collapse.
        ctx.fillStyle = `rgba(202,255,212,${0.25 + ease * 0.75})`
        ctx.fillRect(0, H / 2 - 1.5, W, 3)
      } else if (elapsed < DOT_END) {
        // ---- Phase 3: the line dies to a phosphor dot ----
        const k = (elapsed - COLLAPSE_END) / (DOT_END - COLLAPSE_END)
        const ease = 1 - Math.pow(1 - k, 2)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = '#010409'
        ctx.fillRect(0, 0, W, H)
        const lw = W * (1 - ease)
        ctx.fillStyle = `rgba(202,255,212,${1 - ease * 0.4})`
        ctx.fillRect((W - lw) / 2, H / 2 - 1.5, lw, 3)
        const r = 22 * (1 - ease) + 2
        const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r * 4)
        grad.addColorStop(0, `rgba(126,231,135,${0.8 * (1 - ease)})`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fillRect(W / 2 - r * 4, H / 2 - r * 4, r * 8, r * 8)
      }

      if (elapsed < DOT_END) {
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
      {labelVisible && (
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
              whiteSpace: 'pre',
            }}
          >
            {label}<span className="dpe-cursor">_</span>
          </div>
        </div>
      )}
    </div>
  )
}
