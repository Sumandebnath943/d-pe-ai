"use client"
import { useEffect, useState } from 'react'
import { Session } from '@/lib/types'
import MemoryDrawer from './MemoryDrawer'
import DatasetPanel from './DatasetPanel'

interface Props {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  onDatasetsChange: () => void
  mode: 'normal' | 'advanced'
  setMode: (mode: 'normal' | 'advanced') => void
  disabledDatasetIds: string[]
  onToggleDataset: (id: string) => void
}

type SidebarTab = 'sessions' | 'data'

export default function Sidebar({ sessions, activeSessionId, onSelectSession, onNewSession, onDeleteSession, onDatasetsChange, mode, setMode, disabledDatasetIds, onToggleDataset }: Props) {
  const [isDark, setIsDark] = useState(false)
  const [isMemoryOpen, setIsMemoryOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SidebarTab>('sessions')

  useEffect(() => {
    const isDarkStored = localStorage.getItem('theme') === 'dark'
    setIsDark(isDarkStored)
    if (isDarkStored) document.documentElement.classList.add('dark-theme')
  }, [])

  const toggleTheme = () => {
    const nextDark = !isDark
    setIsDark(nextDark)
    if (nextDark) {
      document.documentElement.classList.add('dark-theme')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark-theme')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <>
      <MemoryDrawer isOpen={isMemoryOpen} onClose={() => setIsMemoryOpen(false)} />

      <div style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <style>{`
          .sb-item { transition: background 0.15s; border-radius: 6px; }
          .sb-item:hover { background: var(--surface); }
          .sb-del { opacity: 0; transition: opacity 0.15s; }
          .sb-item:hover .sb-del { opacity: 1; }
        `}</style>

        {/* Brand */}
        <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
                <line x1="16" y1="8" x2="2" y2="22"/>
                <line x1="17.5" y1="15" x2="9" y2="15"/>
              </svg>
            </div>
            <span style={{ 
              fontFamily: 'var(--font-sans), sans-serif', 
              fontSize: '18px', 
              fontWeight: 600, 
              color: 'var(--text-1)',
              letterSpacing: '-0.02em'
            }}>D-PE.ai</span>
            </div>
            
            <button
              onClick={() => setIsMemoryOpen(true)}
              title="Memory"
              style={{
                background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: '6px', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </button>
          </div>

          {/* Generation Mode Toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--surface-2)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            {(['normal', 'advanced'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                title={m === 'normal'
                  ? 'Normal — single-shot prompt generation'
                  : 'Advanced — generates several candidate prompts and picks the best'}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  background: mode === m ? 'var(--bg)' : 'transparent',
                  color: mode === m ? 'var(--text-1)' : 'var(--text-3)',
                  border: `1px solid ${mode === m ? 'var(--border)' : 'transparent'}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: mode === m ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* New Session + Memory */}
        <div style={{ padding: '0 12px 12px', display: 'flex', gap: '6px' }}>
          <button onClick={onNewSession} style={{
            flex: 1, padding: '8px 0', background: 'none', border: 'none',
            color: 'var(--text-2)', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px',
            paddingLeft: '8px', borderRadius: '6px', transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: '16px', lineHeight: 1, color: 'var(--text-3)' }}>+</span>
            New session
          </button>
          <button onClick={() => setIsMemoryOpen(true)} style={{
            padding: '8px', background: 'none', border: 'none',
            color: 'var(--text-3)', cursor: 'pointer', borderRadius: '6px',
            display: 'flex', alignItems: 'center', transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            title="Memory"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M2 12h7"/><path d="M15 12h7"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 12px', gap: '2px', marginBottom: '4px' }}>
          {(['sessions', 'data'] as SidebarTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '7px 0', background: activeTab === tab ? 'var(--surface)' : 'none',
              border: 'none', borderRadius: '6px', color: activeTab === tab ? 'var(--text-1)' : 'var(--text-3)',
              cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab ? 500 : 400,
              transition: 'all 0.15s',
            }}>
              {tab === 'sessions' ? 'Sessions' : 'Datasets'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {activeTab === 'sessions' ? (
            sessions.map(s => {
              const isActive = s.id === activeSessionId
              return (
                <div key={s.id} className="sb-item" onClick={() => onSelectSession(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 12px',
                  background: isActive ? 'var(--surface)' : 'transparent',
                  color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                  fontSize: '13px', cursor: 'pointer',
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title?.slice(0, 30) || 'Untitled'}
                  </span>
                  {s.generatedPrompt && (
                    <span style={{ width: '5px', height: '5px', background: 'var(--green)', borderRadius: '50%', flexShrink: 0 }} />
                  )}
                  <button className="sb-del" onClick={e => { e.stopPropagation(); onDeleteSession(s.id) }} style={{
                    background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer',
                    fontSize: '15px', lineHeight: 1, padding: 0, flexShrink: 0,
                  }}>×</button>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '4px' }}>
              <DatasetPanel
                onDatasetsChange={onDatasetsChange}
                disabledDatasetIds={disabledDatasetIds}
                onToggleDataset={onToggleDataset}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', background: 'var(--green)', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>Llama-3.3-70B</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500 }}>Beta</span>
        </div>
      </div>
    </>
  )
}
