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
  tournament?: Tournament;
  responsibility?: ResponsibilityReport;
}

// --- Responsible AI: constitutional critique-then-revise ---

export type RuleStatus = 'pass' | 'warn' | 'fail';

export interface ResponsibilityFinding {
  ruleId: string;
  ruleTitle: string;
  status: RuleStatus;
  note: string;
}

export interface ResponsibilityReport {
  status: 'reviewing' | 'done' | 'error';
  // safe = nothing to fix; revised = breaches found and auto-rewritten; flagged = issues noted but not rewritten
  verdict: 'safe' | 'revised' | 'flagged';
  score: number;             // 0-100 overall responsibility score
  summary: string;
  findings: ResponsibilityFinding[];
  revised: boolean;
  revisedPrompt?: string;    // present only when verdict === 'revised'
  error?: string;
}

// --- Advanced mode: best-of-N tournament ---

export interface PromptCandidate {
  id: string;
  label: string;      // short display name, e.g. "Chain-of-Thought"
  strategy: string;   // one-line description of the approach
  prompt: string;     // the full candidate system prompt
}

export interface CandidateRun {
  candidateId: string;
  outputs: string[];  // one output per test case
}

export interface CandidateScore {
  candidateId: string;
  score: number;      // 0-100
  reasoning: string;  // why the judge scored it this way
}

export interface Tournament {
  status: 'running' | 'done' | 'error';
  stage: string;               // human-readable current stage
  testcases: string[];
  candidates: PromptCandidate[];
  runs: CandidateRun[];
  scores: CandidateScore[];
  winnerId?: string;
  error?: string;
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
  /** 384-dim normalized embedding (all-MiniLM-L6-v2). Optional for legacy chunks. */
  embedding?: number[];
}
