"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dataset } from '@/lib/types'
import { parseFile, validateFile } from '@/lib/rag/parser'
import { chunkText } from '@/lib/rag/chunker'
import { saveDataset, getDatasets, deleteDataset } from '@/lib/rag/store'
import { embedTexts, onModelProgress } from '@/lib/rag/embeddings'

interface Props {
  onDatasetsChange: () => void
}

export default function DatasetPanel({ onDatasetsChange }: Props) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDatasets = useCallback(async () => {
    try {
      const ds = await getDatasets()
      setDatasets(ds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
    } catch (err) {
      console.error('Failed to load datasets:', err)
    }
  }, [])

  useEffect(() => {
    loadDatasets()
  }, [loadDatasets])

  const processFile = async (file: File) => {
    setError(null)

    // Validate
    const validation = validateFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file.')
      return
    }

    setIsUploading(true)
    setUploadProgress('Extracting text...')

    try {
      // Parse file to text
      const text = await parseFile(file)

      if (!text || text.trim().length < 20) {
        throw new Error('File contains too little text to process.')
      }

      setUploadProgress('Chunking...')

      // Generate dataset ID
      const datasetId = `ds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      // Chunk the text
      const chunks = chunkText(text, datasetId)

      if (chunks.length === 0) {
        throw new Error('No meaningful chunks could be created from this file.')
      }

      // Build the semantic half of the hybrid index: embed every chunk locally.
      // First upload pays a one-time model download; we surface it as progress.
      let embeddedChunks = chunks
      try {
        onModelProgress((pct) => setUploadProgress(`Loading embedding model… ${pct}%`))
        const vectors = await embedTexts(
          chunks.map((c) => c.text),
          (done, total) => setUploadProgress(`Embedding ${done}/${total} chunks…`)
        )
        embeddedChunks = chunks.map((c, i) => ({ ...c, embedding: vectors[i] }))
      } catch (embErr) {
        // Semantic indexing is best-effort — fall back to keyword-only (BM25).
        console.error('[RAG] Embedding failed, falling back to keyword-only:', embErr)
      } finally {
        onModelProgress(null)
      }

      setUploadProgress(`Indexing ${chunks.length} chunks...`)

      // Create dataset metadata
      const dataset: Dataset = {
        id: datasetId,
        name: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name,
        fileSize: file.size,
        fileType: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        chunkCount: chunks.length,
        createdAt: new Date(),
      }

      // Save to IndexedDB
      await saveDataset(dataset, embeddedChunks)

      setUploadProgress('Complete')
      await loadDatasets()
      onDatasetsChange()

      setTimeout(() => setUploadProgress(''), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleDelete = async (id: string) => {
    await deleteDataset(id)
    await loadDatasets()
    onDatasetsChange()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Drop Zone */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `1px dashed ${isDragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '8px',
          background: isDragOver ? 'var(--accent-light)' : 'var(--bg)',
          padding: '20px 16px',
          textAlign: 'center',
          cursor: isUploading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {isUploading ? (
          <div className="label-sm" style={{ color: 'var(--accent)' }}>
            {uploadProgress}
          </div>
        ) : (
          <>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              color: 'var(--text-2)',
              marginBottom: '6px'
            }}>
              Drop a file here, or click to browse
            </div>
            <div style={{
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-4)'
            }}>
              txt, md, csv, json, pdf, docx — 25 MB max
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.pdf,.docx"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(255,68,68,0.08)',
          border: '1px solid rgba(255,68,68,0.2)',
          borderRadius: '6px',
          color: '#cc5555',
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          lineHeight: 1.5
        }}>
          {error}
        </div>
      )}

      {/* Dataset List */}
      {datasets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <style>{`
            .dataset-row { border-radius: 6px; }
            .dataset-row:hover { background: var(--surface-2) !important; }
            .dataset-delete { opacity: 0; transition: all 0.2s ease; }
            .dataset-row:hover .dataset-delete { opacity: 1; }
          `}</style>
          {datasets.map(ds => (
            <div
              key={ds.id}
              className="dataset-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--text-3)',
                background: 'var(--surface-2)',
                borderRadius: '4px',
                padding: '2px 6px',
                flexShrink: 0,
              }}>.{ds.fileType}</span>

              <span style={{
                flex: 1,
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                color: 'var(--text-1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{ds.name}</span>

              <span className="label-sm" style={{ color: 'var(--text-4)', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                {ds.chunkCount} chunks
              </span>

              <span className="label-sm" style={{ color: 'var(--text-4)', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                {formatSize(ds.fileSize)}
              </span>

              <button
                className="dataset-delete"
                onClick={() => handleDelete(ds.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  lineHeight: 1,
                  padding: '2px 4px',
                  borderRadius: '4px',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.background = 'var(--accent-light)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-3)'
                  e.currentTarget.style.background = 'none'
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
