"use client"

import { useState, useEffect } from 'react'
import { Memory, MemoryCategory } from '@/lib/types'
import { getMemories, addMemory, deleteMemory, clearAllMemories } from '@/lib/memory'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  preference: 'Preference',
  domain_knowledge: 'Domain Knowledge',
  instruction: 'Instruction',
  context: 'Context',
}

const CATEGORY_OPTIONS: MemoryCategory[] = ['preference', 'domain_knowledge', 'instruction', 'context']

export default function MemoryDrawer({ isOpen, onClose }: Props) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<MemoryCategory>('context')
  const [filter, setFilter] = useState<MemoryCategory | 'all'>('all')

  useEffect(() => {
    if (isOpen) {
      setMemories(getMemories())
    }
  }, [isOpen])

  const handleAdd = () => {
    const text = newContent.trim()
    if (!text) return
    addMemory(text, newCategory, 'manual')
    setMemories(getMemories())
    setNewContent('')
  }

  const handleDelete = (id: string) => {
    deleteMemory(id)
    setMemories(getMemories())
  }

  const handleClearAll = () => {
    if (confirm('Delete all memories? This cannot be undone.')) {
      clearAllMemories()
      setMemories([])
    }
  }

  const filtered = filter === 'all' ? memories : memories.filter(m => m.category === filter)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 90,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: isOpen ? 0 : '-420px',
        width: '400px',
        height: '100%',
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isOpen ? '8px 0 40px rgba(0,0,0,0.15)' : 'none',
        borderRadius: '0 6px 6px 0',
      }}>
        <style>{`
          .memory-scroll::-webkit-scrollbar { width: 6px; }
          .memory-scroll::-webkit-scrollbar-track { background: transparent; }
          .memory-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
          .memory-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-3); }
          .filter-pill:hover { background: var(--accent-light) !important; color: var(--accent) !important; border-color: var(--accent-border) !important; }
          .clear-all-btn:hover { color: #c0392b !important; }
          .memory-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08) !important; }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px', height: '8px',
              background: 'var(--accent)',
              borderRadius: '50%',
            }} />
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-1)',
              letterSpacing: '-0.01em',
            }}>Memory</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-3)',
            }}>{memories.length}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '18px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.background = 'var(--border-subtle)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none' }}
          >✕</button>
        </div>

        {/* Add New Memory */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flexShrink: 0,
        }}>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } }}
            placeholder="Add a memory..."
            rows={2}
            style={{
              width: '100%',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              padding: '10px 12px',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              color: 'var(--text-1)',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              borderRadius: '6px',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as MemoryCategory)}
              style={{
                flex: 1,
                height: '34px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                padding: '0 10px',
                cursor: 'pointer',
                outline: 'none',
                borderRadius: '4px',
                transition: 'border-color 0.2s ease',
              }}
            >
              {CATEGORY_OPTIONS.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!newContent.trim()}
              style={{
                padding: '0 18px',
                height: '34px',
                background: newContent.trim() ? 'var(--accent)' : 'var(--border)',
                color: newContent.trim() ? 'white' : 'var(--text-4)',
                border: 'none',
                cursor: newContent.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                borderRadius: '4px',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >Save</button>
          </div>
        </div>

        {/* Filter */}
        <div style={{
          padding: '12px 24px',
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          {(['all', ...CATEGORY_OPTIONS] as const).map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className="filter-pill"
              style={{
                padding: '4px 12px',
                background: filter === c ? 'var(--accent-light)' : 'transparent',
                color: filter === c ? 'var(--accent)' : 'var(--text-3)',
                border: `1px solid ${filter === c ? 'var(--accent-border)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderRadius: '20px',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                fontWeight: filter === c ? 500 : 400,
              }}
            >{c === 'all' ? 'All' : CATEGORY_LABELS[c]}</button>
          ))}
        </div>

        {/* Memory List */}
        <div className="memory-scroll" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px',
        }}>
          {filtered.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 0',
              color: 'var(--text-3)',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
            }}>
              <div className="label-sm" style={{ color: 'var(--text-4)', marginBottom: '8px', fontFamily: 'var(--font-sans)', fontSize: '12px' }}>Empty</div>
              No memories saved yet.
            </div>
          ) : (
            filtered.map(m => (
              <div
                key={m.id}
                className="memory-card"
                style={{
                  padding: '14px',
                  marginBottom: '12px',
                  background: 'var(--bg)',
                  transition: 'all 0.2s ease',
                  borderRadius: '6px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '13px',
                    color: 'var(--text-1)',
                    lineHeight: 1.6,
                    flex: 1,
                  }}>{m.content}</div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-4)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      flexShrink: 0,
                      lineHeight: 1,
                      transition: 'color 0.2s ease',
                      borderRadius: '4px',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
                  >×</button>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                  <span className="label-sm" style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    color: 'var(--accent)',
                    padding: '2px 8px',
                    border: '1px solid var(--accent-border)',
                    background: 'var(--accent-light)',
                    borderRadius: '20px',
                    fontWeight: 500,
                  }}>{CATEGORY_LABELS[m.category]}</span>
                  <span className="label-sm" style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    color: 'var(--text-4)',
                  }}>
                    {m.source === 'manual' ? 'Manual' : m.source.charAt(0).toUpperCase() + m.source.slice(1)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {memories.length > 0 && (
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}>
            <button
              onClick={handleClearAll}
              className="clear-all-btn"
              style={{
                width: '100%',
                padding: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: 400,
                borderRadius: '4px',
              }}
            >Clear all</button>
          </div>
        )}
      </div>
    </>
  )
}
