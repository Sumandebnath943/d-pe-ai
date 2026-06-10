"use client"
import { useState } from 'react'
import OptimizerPanel from './OptimizerPanel'
import ArchitectureCanvas from './ArchitectureCanvas'

export default function LabWorkspace() {
  const [activeTab, setActiveTab] = useState<'optimizer' | 'canvas' | 'graph'>('optimizer')

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Header Tabs */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: '24px',
        background: 'var(--surface)'
      }}>
        <button
          onClick={() => setActiveTab('optimizer')}
          style={{
            background: 'none', border: 'none',
            color: activeTab === 'optimizer' ? 'var(--text-1)' : 'var(--text-3)',
            fontSize: '14px', fontWeight: activeTab === 'optimizer' ? 600 : 500,
            cursor: 'pointer',
            borderBottom: activeTab === 'optimizer' ? '2px solid var(--text-1)' : '2px solid transparent',
            paddingBottom: '8px',
            marginBottom: '-17px' // to align with borderBottom
          }}
        >
          Auto-Optimizer
        </button>
        <button
          onClick={() => setActiveTab('canvas')}
          style={{
            background: 'none', border: 'none',
            color: activeTab === 'canvas' ? 'var(--text-1)' : 'var(--text-3)',
            fontSize: '14px', fontWeight: activeTab === 'canvas' ? 600 : 500,
            cursor: 'pointer',
            borderBottom: activeTab === 'canvas' ? '2px solid var(--text-1)' : '2px solid transparent',
            paddingBottom: '8px',
            marginBottom: '-17px'
          }}
        >
          Architecture Canvas
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          style={{
            background: 'none', border: 'none',
            color: activeTab === 'graph' ? 'var(--text-1)' : 'var(--text-3)',
            fontSize: '14px', fontWeight: activeTab === 'graph' ? 600 : 500,
            cursor: 'pointer',
            borderBottom: activeTab === 'graph' ? '2px solid var(--text-1)' : '2px solid transparent',
            paddingBottom: '8px',
            marginBottom: '-17px'
          }}
        >
          GraphRAG Data
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'optimizer' && <OptimizerPanel />}
        {activeTab === 'canvas' && (
          <div style={{ width: '100%', height: '100%' }}>
            <ArchitectureCanvas />
          </div>
        )}
        {activeTab === 'graph' && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>
            GraphRAG coming in Phase 2C.
          </div>
        )}
      </div>
    </div>
  )
}
