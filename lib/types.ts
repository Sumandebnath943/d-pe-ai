export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface GeneratedPrompt {
  content: string;
  createdAt: Date;
  sessionId: string;
}

export interface Session {
  id: string;
  title: string;
  createdAt: Date;
  messages: Message[];
  generatedPrompt?: GeneratedPrompt;
  promptVersion?: number;
}

// --- Memory Types ---

export type MemoryCategory = 'preference' | 'domain_knowledge' | 'instruction' | 'context';

export interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  createdAt: Date;
  source: string; // e.g. "manual", "session:<id>"
}

// --- RAG Types ---

export interface Dataset {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  chunkCount: number;
  createdAt: Date;
}

export interface Chunk {
  id: string;
  datasetId: string;
  text: string;
  index: number;
}
