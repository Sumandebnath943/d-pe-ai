"use client"
import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onUnlock: () => void
}

type OutputLine = { text: string; isCommand?: boolean; color?: string; }

const BOOT_SEQUENCE = [
  { text: "    ____       ____  ______               _ ", delay: 100, color: '#30363d' },
  { text: "   / __ \\     / __ \\/ ____/   ____ _(_) ", delay: 150, color: '#30363d' },
  { text: "  / / / /____/ /_/ / __/     / __ `/ /  ", delay: 200, color: '#3fb950' },
  { text: " / /_/ /____/ ____/ /___    / /_/ / /   ", delay: 250, color: '#3fb950' },
  { text: "/_____/    /_/   /_____/   \\__,_/_/    ", delay: 300, color: '#3fb950' },
  { text: "                                        ", delay: 350, color: '#3fb950' },
  { text: "", delay: 400 },
  { text: "$ systemctl start d-pe.service", delay: 600 },
  { text: "Downloading more RAM for the LLM... [OK]", delay: 900, color: '#8b949e' },
  { text: "Bribing the AI with digital cookies... [OK]", delay: 1100, color: '#8b949e' },
  { text: "If this crashes, it's definitely the API's fault.", delay: 1300 },
  { text: "Awaiting workspace checkout. Type 'init d-pe'", delay: 1500, color: '#e3b341' },
]

const JOKE_COMMANDS: Record<string, string> = {
  'sudo rm -rf /': "Nice try. I'm running in a browser, not your production server. Though I did just delete your browser history. You're welcome.",
  'ls': "I could list the files, but they're mostly just node_modules and regret.",
  'cd': "You are already at the center of the universe. There's nowhere else to go.",
  'whoami': "You are a meat-based biological entity attempting to intimidate a superior artificial intelligence.",
  'pwd': "You are here. And 'here' is a dark, lonely terminal.",
  'clear': "I can clear the screen, but I can't clear your conscience.",
  'exit': "You can close the tab any time you like, but you can never leave.",
  'git status': "On branch panic. Your code is ahead of 'origin/main' by 3 bugs.",
  'npm run dev': "I'm already running. And I'm silently judging your code.",
  'ping': "Pong. Also, I have a boyfriend.",
  'echo': "Yes, your voice sounds very nice. Very booming.",
  'vim': "You don't know how to exit vim. Don't lie to me.",
  'history': "Trust me, you don't want anyone seeing your prompt history.",
  'docker': "Containers are a lie. It's just someone else's computer.",
  'docker-compose up': "Containers are a lie. It's just someone else's computer.",
  'python': "IndentationError: unexpected indent. See? I can be annoying too."
};

const FALLBACK_JOKES = [
  "bash: {cmd}: command not found. Did you type that with your elbows?",
  "'{cmd}' is not a valid command. Have you tried turning yourself off and on again?",
  "I asked the latest LLM what '{cmd}' means and it just laughed.",
  "Error 404: Typing skills not found.",
  "Look, we both know you're just mashing the keyboard. Type 'init d-pe' to get to the real app."
];

export default function TerminalLanding({ onUnlock }: Props) {
  const [lines, setLines] = useState<OutputLine[]>([])
  const [inputValue, setInputValue] = useState('')
  const [bootComplete, setBootComplete] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    BOOT_SEQUENCE.forEach((item, index) => {
      setTimeout(() => {
        setLines(prev => [...prev, { text: item.text, color: item.color }]);
        if (index === BOOT_SEQUENCE.length - 1) setTimeout(() => setBootComplete(true), 300);
      }, item.delay);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (bootComplete && !isCheckingOut && inputRef.current) inputRef.current.focus();
  }, [lines, bootComplete, isCheckingOut]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCheckingOut) return;
    const rawCmd = inputValue.trim();
    const cmd = rawCmd.toLowerCase();
    if (!cmd) return;

    setLines(prev => [...prev, { text: `user@d-pe-ai:~$ ${rawCmd}`, isCommand: true }]);
    setInputValue('');

    if (['init d-pe', 'sudo d-pe', 'git checkout d-pe'].includes(cmd)) {
      setIsCheckingOut(true)
      
      const checkoutLogs = [
        { text: "git checkout -b d-pe-final-v2-ACTUAL-final", delay: 100, color: '#c9d1d9' },
        { text: "Switched to a new branch 'd-pe-final-v2-ACTUAL-final'", delay: 300, color: '#8b949e' },
        { text: "Deleting node_modules just to be safe: 100% (99999/99999), done.", delay: 600, color: '#8b949e' },
        { text: "Googling how to exit vim: 100% (1/1), done.", delay: 800, color: '#8b949e' },
        { text: "HEAD is now at 9f8a2b1 fix: please just work", delay: 1000, color: '#3fb950' },
      ];

      checkoutLogs.forEach(log => {
        setTimeout(() => {
          setLines(prev => [...prev, { text: log.text, color: log.color }]);
        }, log.delay);
      });

      setTimeout(() => onUnlock(), 1500);
    } else if (cmd === 'help') {
      setLines(prev => [...prev, { text: 'Type "init d-pe" or "git checkout d-pe" to enter.', color: '#58a6ff' }]);
    } else if (JOKE_COMMANDS[cmd] || JOKE_COMMANDS[cmd.split(' ')[0]]) {
      // Check for exact match or first word match (e.g. "ls -la" matches "ls")
      const joke = JOKE_COMMANDS[cmd] || JOKE_COMMANDS[cmd.split(' ')[0]];
      setLines(prev => [...prev, { text: `AI: ${joke}`, color: '#c678dd' }]);
    } else {
      const randomJoke = FALLBACK_JOKES[Math.floor(Math.random() * FALLBACK_JOKES.length)].replace('{cmd}', rawCmd);
      setLines(prev => [...prev, { text: `AI: ${randomJoke}`, color: '#f85149' }]);
    }
  };

  const commits = [
    { hash: "9f8a2b1", msg: "feat(socratic): added AI to argue with you about your prompts", branch: "HEAD -> main" },
    { hash: "3c4d5e6", msg: "feat(graphrag): stuffed 22MB of embeddings into the browser. Sorry mobile users." },
    { hash: "7b1c4a2", msg: "feat(canvas): added drag-and-drop canvas because devs refuse to read JSON" },
    { hash: "1a2b3c4", msg: "feat(optimizer): automated my job so I can sleep" },
    { hash: "0000000", msg: "Initial commit. God help us all." }
  ];

  const renderCommitMsg = (msg: string) => {
    const match = msg.match(/^([a-z]+)(\([a-z-]+\))?:\s*(.*)$/i);
    if (match) {
      return (
        <span>
          <span style={{ color: '#c678dd' }}>{match[1]}</span>
          {match[2] && <span style={{ color: '#61afef' }}>{match[2]}</span>}
          <span style={{ color: '#abb2bf' }}>: </span>
          <span style={{ color: '#98c379' }}>{match[3]}</span>
        </span>
      );
    }
    return <span style={{ color: '#98c379' }}>{msg}</span>;
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: '#0d1117', 
      backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
      color: '#c9d1d9', 
      display: 'flex', 
      fontFamily: "'JetBrains Mono', 'Courier New', monospace" 
    }}>
      
      {/* LEFT SIDE: Git Log Graph */}
      <div style={{ flex: 1, padding: '60px', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(13, 17, 23, 0.85)', backdropFilter: 'blur(4px)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#e6edf3', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#8b949e' }}>d-pe-ai</span> / <span style={{ fontWeight: 800 }}>core-environment</span>
        </h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', fontSize: '13px' }}>
          {commits.map((commit, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}
              transition={{ delay: i * 0.15, duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'stretch', gap: '16px', padding: '12px', marginLeft: '-12px', marginRight: '-12px', cursor: 'default' }}
            >
              {/* Branch visualization line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', border: '2px solid #3fb950', background: '#0d1117', zIndex: 2, marginTop: '6px', flexShrink: 0, boxShadow: '0 0 8px rgba(63, 185, 80, 0.4)' }} />
                {i < commits.length - 1 && (
                  <div style={{ width: '1px', flex: 1, background: '#30363d', margin: '4px 0', minHeight: '24px' }} />
                )}
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ color: '#e3b341', paddingTop: '1px' }}>{commit.hash}</span>
                {commit.branch && (
                  <span style={{ 
                    color: '#58a6ff', 
                    border: '1px solid rgba(88,166,255,0.3)', 
                    background: 'rgba(88,166,255,0.05)',
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontSize: '11px', 
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    marginTop: '1px'
                  }}>
                    {commit.branch}
                  </span>
                )}
                <span style={{ paddingTop: '1px', lineHeight: 1.5 }}>
                  {renderCommitMsg(commit.msg)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: Raw Terminal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px', background: 'rgba(1, 4, 9, 0.9)', backdropFilter: 'blur(4px)' }}>
        <div style={{ fontSize: '12px', color: '#8b949e', borderBottom: '1px solid #30363d', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Terminal - bash - 80x24</span>
          <span style={{ color: '#3fb950' }}>● Active</span>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', fontSize: '14px', lineHeight: 1.6 }} onClick={() => !isCheckingOut && inputRef.current?.focus()}>
          {lines.map((line, i) => (
            <div key={i} style={{ color: line.color || '#c9d1d9', opacity: line.isCommand ? 0.7 : 1, marginBottom: '4px', whiteSpace: 'pre-wrap' }}>
              {line.text}
            </div>
          ))}
          
          {bootComplete && !isCheckingOut && (
            <form onSubmit={handleCommand} style={{ display: 'flex', marginTop: '8px', alignItems: 'center' }}>
              <span style={{ color: '#3fb950', marginRight: '12px' }}>user@d-pe-ai:~$</span>
              <input 
                ref={inputRef} 
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                autoFocus 
                spellCheck="false"
                style={{ background: 'transparent', border: 'none', color: '#c9d1d9', fontFamily: 'inherit', fontSize: '14px', flex: 1, outline: 'none', caretColor: '#e3b341' }} 
              />
            </form>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

    </div>
  )
}
