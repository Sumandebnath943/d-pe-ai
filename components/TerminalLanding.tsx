"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])

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

  const status = isCheckingOut ? 'CHECKOUT' : bootComplete ? 'READY' : 'BOOTING'
  const statusColor = isCheckingOut ? C.amber : bootComplete ? C.green : C.blue
  const fontStack = "var(--font-terminal), 'JetBrains Mono', ui-monospace, 'SF Mono', 'Courier New', monospace"
  const isNarrow = vw < 880

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#010409',
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
      backgroundSize: '22px 22px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(16px, 3vw, 40px)', fontFamily: fontStack, overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 38%, rgba(1,4,9,0.9) 100%)',
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
        {/* LEFT — the brand anchor (never scrolls) */}
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          style={{
            flexShrink: 0,
            width: isNarrow ? '100%' : 'clamp(280px, 30vw, 380px)',
            display: 'flex', flexDirection: 'column',
            alignItems: isNarrow ? 'center' : 'flex-start',
            textAlign: isNarrow ? 'center' : 'left',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 1,
            fontWeight: 800, fontSize: isNarrow ? 'clamp(34px, 11vw, 52px)' : 'clamp(44px, 5vw, 76px)',
            letterSpacing: '0.02em', lineHeight: 1,
          }}>
            <span style={{ color: C.bright }}>D</span>
            <span style={{ color: C.greenSoft, textShadow: '0 0 22px rgba(126,231,135,0.5)' }}>·</span>
            <span style={{ color: C.bright }}>PE</span>
            <span style={{ color: C.muted, fontWeight: 600 }}>.ai</span>
            <span className="dpe-cursor" style={{ color: C.greenSoft, fontWeight: 400, marginLeft: 6 }}>▮</span>
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
        </motion.div>

        {/* RIGHT — the terminal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          style={{
            position: 'relative',
            width: isNarrow ? '100%' : 'auto',
            flex: isNarrow ? 'none' : 1,
            maxWidth: isNarrow ? '100%' : '620px',
            height: isNarrow ? 'min(60vh, 520px)' : 'min(82vh, 700px)',
            background: 'rgba(13, 17, 23, 0.94)',
            border: `1px solid ${C.border}`, borderRadius: 'clamp(8px, 1.4vw, 12px)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            backdropFilter: 'blur(6px)',
          }}
        >
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
          className="dpe-scroll"
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
                    {inputValue}
                    <span className="dpe-cursor" style={{ color: C.greenSoft }}>▮</span>
                  </span>
                  <input
                    ref={inputRef} type="text" value={inputValue}
                    onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
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
              {inputValue.length === 0 && (
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
            {!isNarrow && <span style={{ color: C.faint }}>llama-3.3-70b</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            {!isNarrow && <span style={{ color: C.faint }}>9 pillars</span>}
            {!isNarrow && <span style={{ color: C.faint }}>UTF-8</span>}
            <span>{clock}</span>
          </div>
        </div>
        </motion.div>
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
