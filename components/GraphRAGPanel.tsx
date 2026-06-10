"use client"
import { useState, useRef, useEffect } from 'react'

export default function GraphRAGPanel() {
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [statusText, setStatusText] = useState('Initialize Local Embedding Model')
  
  const [inputText, setInputText] = useState('')
  const [nodes, setNodes] = useState<{id: string, label: string, type: string}[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Use a worker to run transformers.js without blocking UI
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    // We create the worker on mount
    workerRef.current = new Worker(new URL('../workers/embeddingWorker.ts', import.meta.url))
    
    workerRef.current.onmessage = (event) => {
      const { status, message, data } = event.data
      
      if (status === 'ready') {
        setModelReady(true)
        setIsModelLoading(false)
        setStatusText('Model Ready: all-MiniLM-L6-v2')
      } else if (status === 'progress') {
        setStatusText(`Downloading: ${message}%`)
      } else if (status === 'complete') {
        setIsProcessing(false)
        // Simulate extracting entities based on the embedding
        setNodes(prev => [
          ...prev, 
          { id: Date.now().toString(), label: inputText.slice(0, 20) + '...', type: 'concept' }
        ])
        setInputText('')
      }
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [inputText])

  const loadModel = () => {
    if (!workerRef.current || modelReady) return
    setIsModelLoading(true)
    setStatusText('Downloading weights (~22MB)...')
    workerRef.current.postMessage({ action: 'load' })
  }

  const processText = () => {
    if (!workerRef.current || !modelReady || !inputText.trim()) return
    setIsProcessing(true)
    workerRef.current.postMessage({ action: 'embed', text: inputText })
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
          GraphRAG Data Path
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '14px', marginBottom: '24px' }}>
          By running an embedding model locally in your browser, we can construct semantic Knowledge Graphs from your datasets without sending data to external APIs.
        </p>

        {/* Model Status Card */}
        <div style={{ 
          background: modelReady ? 'var(--bg)' : 'var(--surface)', 
          border: `1px solid ${modelReady ? 'var(--accent)' : 'var(--border)'}`, 
          borderRadius: '12px',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Local Transformer Engine
            </div>
            <div style={{ fontSize: '14px', color: modelReady ? 'var(--accent)' : 'var(--text-1)' }}>
              {statusText}
            </div>
          </div>
          {!modelReady && (
            <button
              onClick={loadModel}
              disabled={isModelLoading}
              style={{
                padding: '8px 16px',
                background: 'var(--text-1)',
                color: 'var(--bg)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isModelLoading ? 'wait' : 'pointer',
                opacity: isModelLoading ? 0.7 : 1
              }}
            >
              Load Model
            </button>
          )}
        </div>
      </div>

      {modelReady && (
        <div style={{ flex: 1, display: 'flex', gap: '24px' }}>
          {/* Input Side */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-2)' }}>
              Inject Knowledge
            </h3>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste a concept, paragraph, or definition..."
              style={{
                flex: 1,
                padding: '16px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'none',
                outline: 'none'
              }}
            />
            <button
              onClick={processText}
              disabled={isProcessing || !inputText.trim()}
              style={{
                padding: '12px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: (isProcessing || !inputText.trim()) ? 'not-allowed' : 'pointer',
                opacity: (isProcessing || !inputText.trim()) ? 0.5 : 1
              }}
            >
              {isProcessing ? 'Generating Embedding...' : 'Extract & Map to Graph'}
            </button>
          </div>

          {/* Graph Visualization Side */}
          <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '16px', left: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase' }}>
              Semantic Vector Graph
            </div>
            
            {nodes.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: '13px' }}>
                Graph is empty. Inject knowledge.
              </div>
            ) : (
              <div style={{ padding: '60px 24px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {nodes.map(node => (
                  <div key={node.id} style={{
                    background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
                    padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    {node.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
