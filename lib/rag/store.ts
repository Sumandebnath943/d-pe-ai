/**
 * IndexedDB wrapper for RAG dataset and chunk persistence.
 * Uses a simple promise-based API over the raw IndexedDB interface.
 */

import { Dataset, Chunk } from '../types';

const DB_NAME = 'dpe-rag';
const DB_VERSION = 1;
const DATASETS_STORE = 'datasets';
const CHUNKS_STORE = 'chunks';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DATASETS_STORE)) {
        db.createObjectStore(DATASETS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const store = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
        store.createIndex('datasetId', 'datasetId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Dataset operations ---

export async function saveDataset(dataset: Dataset, chunks: Chunk[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([DATASETS_STORE, CHUNKS_STORE], 'readwrite');

  // Save dataset metadata
  tx.objectStore(DATASETS_STORE).put({
    ...dataset,
    createdAt: dataset.createdAt.toISOString(),
  });

  // Save all chunks
  const chunkStore = tx.objectStore(CHUNKS_STORE);
  for (const chunk of chunks) {
    chunkStore.put(chunk);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDatasets(): Promise<Dataset[]> {
  const db = await openDB();
  const tx = db.transaction(DATASETS_STORE, 'readonly');
  const store = tx.objectStore(DATASETS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result.map((d: any) => ({
        ...d,
        createdAt: new Date(d.createdAt),
      }));
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDataset(datasetId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([DATASETS_STORE, CHUNKS_STORE], 'readwrite');

  // Delete the dataset
  tx.objectStore(DATASETS_STORE).delete(datasetId);

  // Delete all chunks for this dataset
  const chunkStore = tx.objectStore(CHUNKS_STORE);
  const index = chunkStore.index('datasetId');
  const request = index.openCursor(IDBKeyRange.only(datasetId));

  request.onsuccess = () => {
    const cursor = request.result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getChunksByDataset(datasetId: string): Promise<Chunk[]> {
  const db = await openDB();
  const tx = db.transaction(CHUNKS_STORE, 'readonly');
  const index = tx.objectStore(CHUNKS_STORE).index('datasetId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(datasetId));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllChunks(): Promise<Chunk[]> {
  const db = await openDB();
  const tx = db.transaction(CHUNKS_STORE, 'readonly');
  const store = tx.objectStore(CHUNKS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
