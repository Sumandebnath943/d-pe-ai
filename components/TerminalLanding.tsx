"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import CodeRain3D, { CodeRainHandle } from './landing/CodeRain3D'
import Logo from './Logo'

interface Props {
  onUnlock: () => void
}

// --- Refined GitHub-dark palette (calmer greens, less neon glow) ---
const C = {
  text: '#c9d1d9',
  bright: '#e6edf3',
  muted: '#8b949e',
  faint: '#6e7681',
  green: '#3fb950',       // structural accent
  greenSoft: '#7ee787',   // prompt / highlights (easy on the eyes)
  amber: '#d8a657',
  blue: '#58a6ff',
  purple: '#bc8cff',
  red: '#f85149',
  border: '#30363d',
}

type Line = { text?: string; color?: string; isCommand?: boolean; kind?: 'text' | 'graph'; delay: number }

// Boot copy that actually makes sense: it says what D-PE.ai is and that it's private.
const BOOT_LINES: Line[] = [
  { text: '$ d-pe --boot', delay: 280 },
  { text: '  ✓ loaded the 9-pillar prompt framework', color: C.muted, delay: 560 },
  { text: '  ✓ warmed up the Socratic interview engine', color: C.muted, delay: 820 },
  { text: "  ✓ kept your data in this browser — we can't see it", color: C.muted, delay: 1080 },
  { text: '  ready in 0.4s (faster than your last prompt rewrite)', color: C.faint, delay: 1300 },
  { text: '', delay: 1380 },
  { text: '$ git log --oneline   # what you get', delay: 1540 },
  { kind: 'graph', delay: 1720 },
  { text: '', delay: 2080 },
  { text: '# describe an idea → answer a few questions → get a god-tier prompt', color: C.green, delay: 2220 },
]

// Easter-egg sarcasm — opt-in, only fires if the user goes poking around.
const JOKE_COMMANDS: Record<string, string> = {
  'sudo rm -rf /': "Nice try. This runs in your browser, not your prod server. Nothing to delete here but your dignity.",
  'ls': "persona.md  objective.md  context.md  audience.md  +5 more. The 9 pillars. Type 'init d-pe' to actually use them.",
  'cd': "There's only one destination here: a better prompt. Type 'init d-pe'.",
  'whoami': "Someone who's about to stop writing mediocre prompts. Hopefully.",
  'pwd': "/home/you/about-to-build-something-good",
  'cat': "cat: prompt.txt: No such file. That's the whole point — let's write one. 'init d-pe'.",
  'exit': "You can close the tab, but the urge to write better prompts will follow you.",
  'git status': "On branch main. Nothing to commit — because you haven't built your prompt yet. 'init d-pe'.",
  'git push': "Force-pushed to main on a Friday. Bold. The on-call engineer will remember this.",
  'npm run dev': "Already running. And quietly judging your last prompt.",
  'npm install': "Downloading the entire internet, one tarball at a time. Meanwhile, type 'init d-pe'.",
  'vim': "You don't know how to exit vim. Be honest. Type 'init d-pe' instead.",
  'sudo': "With great power comes... still just a prompt builder. Drop the sudo. 'init d-pe'.",
  'help': '__HELP__',
  'clear': '__CLEAR__',
}

const FALLBACK_JOKES = [
  "bash: {cmd}: command not found. But 'init d-pe' is — try that.",
  "'{cmd}'? Never heard of it. 'init d-pe' I know. Type that.",
  "I ran '{cmd}' through the model. It just shrugged. Type 'init d-pe'.",
  "Error 404: that command's not real. 'init d-pe' is. Go on.",
]

const UNLOCK_CMDS = ['init d-pe', 'sudo d-pe', 'git checkout d-pe', 'init']

// Hidden: typing any of these makes the code rain coalesce into a word.
const MATRIX_CMDS = ['matrix', 'the matrix', 'follow the white rabbit', 'red pill', 'neo', 'wake up']

// The commit log doubles as the feature changelog — each line is a real USP,
// stated plainly with a light wink so a first-timer instantly gets the value.
type Commit = { hash: string; type: string; scope: string; msg: string; head?: boolean; isNew?: boolean }
const INITIAL_COMMITS: Commit[] = [
  { hash: 'a9f2c1b', head: true, type: 'feat', scope: 'interview', msg: "it grills you with questions so the prompt isn't a guess" },
  { hash: '7d3e0a4', type: 'feat', scope: '9-pillars', msg: 'persona, context, examples + 6 more — every single time' },
  { hash: '4b8c2f1', type: 'feat', scope: 'reverse', msg: 'paste any output, get the exact prompt that would make it' },
  { hash: '2e5a9d7', type: 'feat', scope: 'your-docs', msg: 'drop in PDFs & files — answers stay grounded in them' },
  { hash: '0c1f6b3', type: 'feat', scope: 'memory', msg: 'remembers your style so you stop repeating yourself' },
  { hash: '0000000', type: 'init', scope: 'd-pe', msg: 'built for anyone tired of mid, generic prompts' },
]

export default function TerminalLanding({ onUnlock }: Props) {
  const [lines, setLines] = useState<Line[]>([])
  const [commits, setCommits] = useState<Commit[]>(INITIAL_COMMITS)
  const [inputValue, setInputValue] = useState('')
  const [bootComplete, setBootComplete] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [clock, setClock] = useState('')
  // Default to desktop for SSR; the effect corrects it after mount (no hydration mismatch).
  const [vw, setVw] = useState(1200)
  // Easter eggs: gold "god-tier" flash (Konami) and the self-typing ghost prompt.
  const [godMode, setGodMode] = useState(false)
  const [ghostText, setGhostText] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])
  const rainRef = useRef<CodeRainHandle>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const konamiAddedRef = useRef(false)

  // Cinematic staging: GSAP owns the brand/terminal entrance, an idle float,
  // and a subtle mouse tilt on the glass terminal. Purely presentational.
  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const card = cardRef.current
    const brand = brandRef.current
    if (!card || !brand) return

    const ctx = gsap.context(() => {
      gsap.set(card, { transformPerspective: 1200 })
      gsap.fromTo(
        Array.from(brand.children),
        { opacity: 0, x: -18 },
        { opacity: 1, x: 0, duration: 0.8, stagger: 0.09, ease: 'power3.out', delay: 0.15 }
      )
      gsap.fromTo(
        card,
        { opacity: 0, y: 46, rotationX: 9, scale: 0.96 },
        {
          opacity: 1, y: 0, rotationX: 0, scale: 1, duration: 1.15, ease: 'power3.out', delay: 0.25,
          onComplete: () => {
            // Idle float — the console hovers like a hologram.
            gsap.to(card, { y: '+=7', duration: 3.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })
          },
        }
      )
    })

    let onTilt: ((e: MouseEvent) => void) | null = null
    if (finePointer) {
      const tiltX = gsap.quickTo(card, 'rotationX', { duration: 0.8, ease: 'power3.out' })
      const tiltY = gsap.quickTo(card, 'rotationY', { duration: 0.8, ease: 'power3.out' })
      onTilt = (e: MouseEvent) => {
        if (window.innerWidth < 880) return
        const nx = (e.clientX / window.innerWidth) * 2 - 1
        const ny = (e.clientY / window.innerHeight) * 2 - 1
        tiltY(nx * 3.2)
        tiltX(-ny * 2.4)
      }
      window.addEventListener('mousemove', onTilt, { passive: true })
    }

    return () => {
      if (onTilt) window.removeEventListener('mousemove', onTilt)
      ctx.revert()
    }
  }, [])

  // Track viewport width to switch between the two-column and stacked layouts.
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Live clock for the status bar.
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Easter egg 1 — the Konami code flips the world god-tier: the rain flashes
  // gold, the status chip reads GOD-TIER, and a trophy commit lands in the log.
  useEffect(() => {
    const seq = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']
    let pos = 0
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      pos = k === seq[pos] ? pos + 1 : k === seq[0] ? 1 : 0
      if (pos < seq.length) return
      pos = 0
      rainRef.current?.godmode()
      setGodMode(true)
      window.setTimeout(() => setGodMode(false), 3600)
      if (konamiAddedRef.current) return
      konamiAddedRef.current = true
      setCommits(prev => [
        { hash: 'g0dt1er', head: true, isNew: true, type: 'feat', scope: 'konami', msg: 'god-tier mode unlocked — +30 better prompts' },
        ...prev.map(c => ({ ...c, head: false })),
      ])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Easter egg 2 — the ghost in the machine. After a stretch of no typing, the
  // terminal types `init d-pe` to itself, thinks better of it, deletes it, and
  // leaves a nudge. Any keypress or click cancels it and resets the wait.
  useEffect(() => {
    if (!bootComplete || isCheckingOut) return
    const TAUNTS = [
      "> the prompt won't write itself. (i can wait.)",
      '> still here. somewhere a mediocre prompt is being written without you.',
      "> fine. i'll stop typing for you. type init d-pe.",
    ]
    let timers: number[] = []
    let idle = 0
    let ghosting = false
    let count = 0

    function stopGhost() {
      timers.forEach(clearTimeout); timers = []
      if (ghosting) { ghosting = false; setGhostText(null) }
    }
    function schedule() {
      window.clearTimeout(idle)
      idle = window.setTimeout(runGhost, 25000)
    }
    function runGhost() {
      if (ghosting || count >= TAUNTS.length) return
      if ((inputRef.current?.value ?? '') !== '') { schedule(); return }
      ghosting = true
      const phrase = 'init d-pe'
      let t = 0
      for (let i = 1; i <= phrase.length; i++) {
        t += 95 + Math.random() * 70
        const v = phrase.slice(0, i)
        timers.push(window.setTimeout(() => setGhostText(v), t))
      }
      t += 950 // hesitate, cursor blinking on the full command
      for (let i = phrase.length - 1; i >= 0; i--) {
        t += 48
        const v = phrase.slice(0, i)
        timers.push(window.setTimeout(() => setGhostText(v), t))
      }
      t += 340
      const line = TAUNTS[count++]
      timers.push(window.setTimeout(() => {
        setGhostText(null); ghosting = false
        setLines(prev => [...prev, { text: line, color: C.faint, delay: 0 }])
        schedule()
      }, t))
    }
    function onActivity() { stopGhost(); schedule() }

    window.addEventListener('keydown', onActivity)
    window.addEventListener('pointerdown', onActivity)
    schedule()
    return () => {
      window.clearTimeout(idle); timers.forEach(clearTimeout)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('pointerdown', onActivity)
    }
  }, [bootComplete, isCheckingOut])

  // Stream the boot scrollback line-by-line; timers are tracked for cleanup + skip.
  useEffect(() => {
    BOOT_LINES.forEach((ln, i) => {
      const id = window.setTimeout(() => {
        setLines(prev => [...prev, ln])
        if (i === BOOT_LINES.length - 1) {
          const done = window.setTimeout(() => setBootComplete(true), 240)
          timersRef.current.push(done)
        }
      }, ln.delay)
      timersRef.current.push(id)
    })
    return () => { timersRef.current.forEach(clearTimeout) }
  }, [])

  const finishBoot = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setLines(BOOT_LINES)
    setBootComplete(true)
  }, [])

  useEffect(() => {
    if (bootComplete) return
    const skip = () => finishBoot()
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [bootComplete, finishBoot])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (bootComplete && !isCheckingOut) inputRef.current?.focus()
  }, [lines, commits, bootComplete, isCheckingOut])

  const pushLines = (incoming: Line[]) => setLines(prev => [...prev, ...incoming])

  const runUnlock = () => {
    setIsCheckingOut(true)
    // The rain goes into overdrive and the console powers up as we jack in.
    rainRef.current?.surge()
    if (cardRef.current) {
      gsap.to(cardRef.current, { scale: 1.012, duration: 0.9, ease: 'power2.in' })
    }
    // A fresh commit lands at the top of the log right before we jack in.
    setCommits(prev => [
      { hash: 'a1b2c3d', head: true, isNew: true, type: 'feat', scope: 'welcome', msg: "you're in. let's build something good." },
      ...prev.map(c => ({ ...c, head: false })),
    ])
    const seq: Line[] = [
      { text: '> spinning up your workspace…', color: C.muted, delay: 160 },
      { text: '> 9 pillars loaded. interview engine hot.', color: C.greenSoft, delay: 460 },
    ]
    seq.forEach(l => {
      const id = window.setTimeout(() => pushLines([l]), l.delay)
      timersRef.current.push(id)
    })
    const done = window.setTimeout(() => onUnlock(), 980)
    timersRef.current.push(done)
  }

  // Easter egg 3 — `matrix` collapses the rain into glowing letters while
  // Morpheus narrates, timed so the lines land as the word resolves.
  const runMatrix = () => {
    rainRef.current?.reveal()
    const seq: Line[] = [
      { text: '> Wake up, Neo…', color: C.greenSoft, delay: 200 },
      { text: '> The Matrix has you.', color: C.green, delay: 1200 },
      { text: '> Follow the white rabbit. 🐇', color: C.muted, delay: 2100 },
      { text: '> No one can tell you what a good prompt is — you have to write it yourself.', color: C.greenSoft, delay: 3500 },
    ]
    seq.forEach(l => {
      const id = window.setTimeout(() => pushLines([{ text: l.text, color: l.color, delay: 0 }]), l.delay)
      timersRef.current.push(id)
    })
  }

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault()
    if (isCheckingOut) return
    const rawCmd = inputValue.trim()
    const cmd = rawCmd.toLowerCase()
    setInputValue('')
    setHistoryIndex(-1)
    if (!cmd) return

    setHistory(prev => [rawCmd, ...prev])
    pushLines([{ text: `you@d-pe:~$ ${rawCmd}`, isCommand: true, delay: 0 }])

    if (UNLOCK_CMDS.includes(cmd)) {
      runUnlock()
      return
    }
    if (MATRIX_CMDS.includes(cmd)) {
      runMatrix()
      return
    }
    const direct = JOKE_COMMANDS[cmd] ?? JOKE_COMMANDS[cmd.split(' ')[0]]
    if (direct === '__CLEAR__') {
      setLines([])
    } else if (direct === '__HELP__') {
      pushLines([
        { text: 'commands:', color: C.blue, delay: 0 },
        { text: '  init d-pe     enter the workspace and start building', color: C.text, delay: 0 },
        { text: '  git log       the feature changelog above', color: C.muted, delay: 0 },
        { text: '  clear         clear the screen', color: C.muted, delay: 0 },
        { text: "  (or poke around: ls, whoami, vim… the AI has opinions)", color: C.faint, delay: 0 },
      ])
    } else if (direct) {
      pushLines([{ text: direct, color: C.purple, delay: 0 }])
    } else {
      const joke = FALLBACK_JOKES[(Math.random() * FALLBACK_JOKES.length) | 0].replace('{cmd}', rawCmd)
      pushLines([{ text: joke, color: C.red, delay: 0 }])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const next = Math.min(historyIndex + 1, history.length - 1)
      setHistoryIndex(next); setInputValue(history[next])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex <= 0) { setHistoryIndex(-1); setInputValue('') }
      else { const next = historyIndex - 1; setHistoryIndex(next); setInputValue(history[next]) }
    }
  }

  const status = isCheckingOut ? 'CHECKOUT' : godMode ? 'GOD-TIER' : bootComplete ? 'READY' : 'BOOTING'
  const statusColor = isCheckingOut ? C.amber : godMode ? '#ffd166' : bootComplete ? C.green : C.blue
  const fontStack = "var(--font-terminal), 'JetBrains Mono', ui-monospace, 'SF Mono', 'Courier New', monospace"
  const isNarrow = vw < 880

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#010409',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(16px, 3vw, 40px)', fontFamily: fontStack, overflow: 'hidden',
      position: 'relative',
    }}>
      {/* 3D code rain — the digital weather behind the glass console. */}
      <CodeRain3D ref={rainRef} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 42%, rgba(1,4,9,0.78) 100%)',
      }} />

      {/* Two-column shell: brand on the left, terminal on the right. */}
      <div style={{
        position: 'relative', width: '100%',
        maxWidth: isNarrow ? '720px' : '1160px',
        display: 'flex',
        flexDirection: isNarrow ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isNarrow ? 'clamp(18px, 4vw, 28px)' : 'clamp(36px, 5vw, 76px)',
      }}>
        {/* LEFT — the brand anchor (never scrolls); GSAP staggers its children in. */}
        <div
          ref={brandRef}
          style={{
            flexShrink: 0,
            width: isNarrow ? '100%' : 'clamp(280px, 30vw, 380px)',
            display: 'flex', flexDirection: 'column',
            alignItems: isNarrow ? 'center' : 'flex-start',
            textAlign: isNarrow ? 'center' : 'left',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: isNarrow ? 12 : 'clamp(14px, 1.6vw, 22px)',
          }}>
            {/* The nine-pillar arrow mark — its sparks carry the blink now. */}
            <span style={{ color: C.bright, filter: 'drop-shadow(0 0 14px rgba(63,185,80,0.45))', flexShrink: 0 }}>
              <Logo size={isNarrow ? 'clamp(34px, 10vw, 48px)' : 'clamp(44px, 4.6vw, 68px)'} twinkle />
            </span>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 1,
              fontWeight: 800, fontSize: isNarrow ? 'clamp(30px, 9.5vw, 46px)' : 'clamp(38px, 4.4vw, 64px)',
              letterSpacing: '0.02em', lineHeight: 1,
            }}>
              <span style={{ color: C.bright }}>D-PE</span>
              <span style={{ color: C.greenSoft, fontWeight: 600, textShadow: '0 0 22px rgba(126,231,135,0.4)' }}>.ai</span>
            </div>
          </div>
          <div style={{
            marginTop: 14, color: C.muted, fontSize: 'clamp(10px, 1.3vw, 12px)',
            letterSpacing: '0.24em', textTransform: 'uppercase',
          }}>
            god-tier prompt engineering
          </div>
          {!isNarrow && (
            <>
              <div style={{ width: 40, height: 1, background: C.border, margin: '26px 0 22px' }} />
              <p style={{ color: C.faint, fontSize: '13px', lineHeight: 1.7, maxWidth: 320 }}>
                An AI prompt engineer that interviews you, then writes a structured,
                9-pillar, production-ready prompt — grounded in your own docs and style.
              </p>
              <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12 }}>
                <span className="dpe-node" style={{ color: C.green }}>●</span>
                <span>boot the console to begin</span>
              </div>
            </>
          )}
        </div>

        {/* RIGHT — the glass terminal; GSAP raises, floats, and tilts it. */}
        <div
          ref={cardRef}
          style={{
            position: 'relative',
            width: isNarrow ? '100%' : 'auto',
            flex: isNarrow ? 'none' : 1,
            maxWidth: isNarrow ? '100%' : '620px',
            height: isNarrow ? 'min(60vh, 520px)' : 'min(82vh, 700px)',
            background: 'rgba(10, 14, 19, 0.78)',
            border: '1px solid rgba(63,185,80,0.18)', borderRadius: 'clamp(8px, 1.4vw, 12px)',
            boxShadow: '0 30px 90px rgba(0,0,0,0.75), 0 0 70px rgba(63,185,80,0.07), inset 0 1px 0 rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            backdropFilter: 'blur(14px) saturate(1.25)',
            willChange: 'transform',
          }}
        >
        {/* Faint scanlines over the glass. */}
        <div className="crt-scan" />
        {/* Window chrome */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 15px', borderBottom: `1px solid ${C.border}`,
          fontSize: '12px', color: C.muted, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f56' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#27c93f' }} />
            <span style={{ marginLeft: 8 }}>you@d-pe — ~/core-environment</span>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="dpe-node" style={{ color: C.green }}>●</span> bash
          </span>
        </div>

        {/* Scrollback (scrollbar hidden via .dpe-scroll) */}
        <div
          className="dpe-scroll dpe-flicker"
          onClick={() => !isCheckingOut && inputRef.current?.focus()}
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            padding: 'clamp(18px, 3vw, 30px)',
            fontSize: 'clamp(12px, 1.35vw, 13.5px)', lineHeight: 1.7, color: C.text,
          }}
        >
          {lines.map((line, i) => (
            line.kind === 'graph' ? (
              <CommitGraph key={`graph-${i}`} commits={commits} />
            ) : (
              <div key={i} style={{
                color: line.color || C.text, opacity: line.isCommand ? 0.62 : 1,
                marginBottom: 3, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {line.text}
              </div>
            )
          ))}

          {bootComplete && !isCheckingOut && (
            <>
              <form onSubmit={handleCommand} style={{ display: 'flex', alignItems: 'baseline', marginTop: 10, gap: 9 }}>
                <span style={{ color: C.greenSoft, flexShrink: 0 }}>you@d-pe:~$</span>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <span aria-hidden style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: C.text }}>
                    {ghostText ?? inputValue}
                    <span className="dpe-cursor" style={{ color: C.greenSoft }}>▮</span>
                  </span>
                  <input
                    ref={inputRef} type="text" value={inputValue}
                    onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                    readOnly={ghostText !== null}
                    autoFocus spellCheck={false} autoComplete="off" aria-label="terminal command input"
                    style={{
                      position: 'absolute', inset: 0, width: '100%',
                      background: 'transparent', border: 'none', outline: 'none',
                      color: 'transparent', caretColor: 'transparent',
                      fontFamily: 'inherit', fontSize: 'inherit',
                    }}
                  />
                </div>
              </form>
              {inputValue.length === 0 && ghostText === null && (
                <div className="dpe-hint" style={{ marginTop: 16, fontSize: 'clamp(11px, 1.3vw, 12.5px)', color: C.muted }}>
                  ‹ type <span style={{ color: C.greenSoft, fontWeight: 600 }}>init d-pe</span> to enter →
                </div>
              )}
            </>
          )}

          {isCheckingOut && (
            <div style={{ marginTop: 10, color: C.amber, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="dpe-cursor">▋</span> jacking in…
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* tmux-style status bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 14px', borderTop: `1px solid ${C.border}`,
          background: 'rgba(22,27,34,0.7)', fontSize: '11px', color: C.muted, flexShrink: 0,
          letterSpacing: '0.02em',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <span style={{
              background: `${statusColor}22`, color: statusColor, padding: '1px 8px',
              borderRadius: 4, fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0,
            }}>{status}</span>
            <span style={{ flexShrink: 0 }}>⎇ main</span>
            {!isNarrow && <span style={{ color: C.faint }}>dpe-core</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            {!isNarrow && <span style={{ color: C.faint }}>9 pillars</span>}
            {!isNarrow && <span style={{ color: C.faint }}>UTF-8</span>}
            <span>{clock}</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

// The commit log, rendered as live git output. Nodes breathe; new commits slide in.
function CommitGraph({ commits }: { commits: Commit[] }) {
  return (
    <div style={{ margin: '4px 0 8px' }}>
      <AnimatePresence initial={false}>
        {commits.map(c => (
          <motion.div
            key={c.hash}
            initial={c.isNew ? { opacity: 0, height: 0, x: -8 } : false}
            animate={{ opacity: 1, height: 'auto', x: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ display: 'flex', alignItems: 'baseline', gap: 9, overflow: 'hidden', marginBottom: 1 }}
          >
            <span className="dpe-node" style={{ color: C.green, flexShrink: 0 }}>*</span>
            <span style={{ color: C.amber, flexShrink: 0 }}>{c.hash}</span>
            {c.head && (
              <span style={{
                color: C.blue, border: '1px solid rgba(88,166,255,0.35)',
                background: 'rgba(88,166,255,0.06)', padding: '0 7px', borderRadius: 10,
                fontSize: '0.8em', whiteSpace: 'nowrap', flexShrink: 0,
              }}>HEAD</span>
            )}
            <span style={{ minWidth: 0, wordBreak: 'break-word' }}>
              <span style={{ color: c.type === 'init' ? C.purple : C.green }}>{c.type}</span>
              <span style={{ color: C.blue }}>({c.scope})</span>
              <span style={{ color: C.muted }}>: </span>
              <span style={{ color: '#adbac7' }}>{c.msg}</span>
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
