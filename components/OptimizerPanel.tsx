"use client"
import { useState, useRef } from 'react'
import Papa from 'papaparse'

export default function OptimizerPanel() {
  const [csvData, setCsvData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [isParsing, setIsParsing] = useState(false)
  
  // Mapping
  const [inputColumn, setInputColumn] = useState<string>('')
  const [expectedColumn, setExpectedColumn] = useState<string>('')
  
  // Optimization State
  const [basePrompt, setBasePrompt] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[]
        const cols = results.meta.fields || []
        setCsvData(data)
        setHeaders(cols)
        setIsParsing(false)
        if (cols.length > 0) setInputColumn(cols[0])
        if (cols.length > 1) setExpectedColumn(cols[1])
      },
      error: (error) => {
        console.error("CSV Parse Error:", error)
        setIsParsing(false)
      }
    })
  }

  const startOptimization = async () => {
    if (!basePrompt.trim() || csvData.length === 0 || !inputColumn || !expectedColumn) return
    setIsOptimizing(true)
    setLogs(['[Optimizer] Initializing genetic algorithm...', `Dataset: ${csvData.length} rows loaded.`, 'Phase 1: Generating baseline variants...'])
    
    // Simulate optimization for now
    setTimeout(() => {
      setLogs(prev => [...prev, '[Optimizer] Running variant A against validation set...'])
    }, 1500)
    setTimeout(() => {
      setLogs(prev => [...prev, '[Optimizer] Variant A score: 72%'])
      setLogs(prev => [...prev, '[Optimizer] Running variant B against validation set...'])
    }, 3000)
    setTimeout(() => {
      setLogs(prev => [...prev, '[Optimizer] Variant B score: 89%'])
      setLogs(prev => [...prev, 'Phase 2: Mutating winning variant (B)...'])
    }, 4500)
    setTimeout(() => {
      setLogs(prev => [...prev, '[Optimizer] Generating final optimized prompt.'])
      setIsOptimizing(false)
    }, 6000)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
        Prompt Auto-Optimizer
      </h2>
      <p style={{ color: 'var(--text-3)', fontSize: '14px', marginBottom: '32px' }}>
        Upload a CSV dataset of Inputs and Expected Outputs. The AI will generate variants of your prompt, test them against your dataset, and genetically mutate the winners until it finds the optimal instructions.
      </p>

      {/* Configuration Section */}
      <div style={{ 
        background: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-2)', marginBottom: '16px' }}>
          1. Upload Evaluation Dataset
        </h3>
        
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload}
          style={{ marginBottom: '16px', fontSize: '14px' }}
        />

        {headers.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-3)', marginBottom: '4px' }}>Input Column</label>
              <select 
                value={inputColumn} 
                onChange={e => setInputColumn(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)' }}
              >
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-3)', marginBottom: '4px' }}>Expected Output Column</label>
              <select 
                value={expectedColumn} 
                onChange={e => setExpectedColumn(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)' }}
              >
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div style={{ 
        background: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-2)', marginBottom: '16px' }}>
          2. Base Prompt
        </h3>
        <textarea
          value={basePrompt}
          onChange={e => setBasePrompt(e.target.value)}
          placeholder="Paste the initial prompt you want to optimize..."
          style={{
            width: '100%', height: '120px', padding: '12px',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: '6px', resize: 'vertical',
            fontFamily: 'var(--font-mono)', fontSize: '13px'
          }}
        />
      </div>

      <div style={{ textAlign: 'right', marginBottom: '24px' }}>
        <button
          onClick={startOptimization}
          disabled={isOptimizing || !basePrompt || csvData.length === 0}
          style={{
            padding: '10px 24px',
            background: 'var(--text-1)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: (isOptimizing || !basePrompt || csvData.length === 0) ? 'not-allowed' : 'pointer',
            opacity: (isOptimizing || !basePrompt || csvData.length === 0) ? 0.5 : 1
          }}
        >
          {isOptimizing ? 'Optimizing...' : 'Start Genetic Optimization'}
        </button>
      </div>

      {/* Logs / Output */}
      {logs.length > 0 && (
        <div style={{
          background: '#000',
          color: '#0f0',
          fontFamily: 'var(--font-mono)',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '12px',
          height: '200px',
          overflowY: 'auto'
        }}>
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>{log}</div>
          ))}
        </div>
      )}
    </div>
  )
}
