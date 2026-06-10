import { Memory, MemoryCategory } from './types';

const STORAGE_KEY = 'dpe-memories';

function generateId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getMemories(): Memory[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((m: any) => ({
      ...m,
      createdAt: new Date(m.createdAt),
    }));
  } catch {
    return [];
  }
}

export function addMemory(
  content: string,
  category: MemoryCategory = 'context',
  source: string = 'manual'
): Memory {
  const memories = getMemories();
  const newMemory: Memory = {
    id: generateId(),
    content: content.trim(),
    category,
    createdAt: new Date(),
    source,
  };
  memories.unshift(newMemory);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  return newMemory;
}

export function deleteMemory(id: string): void {
  const memories = getMemories().filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
}

export function clearAllMemories(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function searchMemories(query: string): Memory[] {
  const memories = getMemories();
  if (!query.trim()) return memories;
  const terms = query.toLowerCase().split(/\s+/);
  return memories.filter(m => {
    const text = m.content.toLowerCase();
    return terms.some(t => text.includes(t));
  });
}

export function getMemoriesByCategory(category: MemoryCategory): Memory[] {
  return getMemories().filter(m => m.category === category);
}

/**
 * Format memories into a block suitable for injection into the system prompt.
 */
export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (memories.length === 0) return '';

  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m.content);
  }

  let block = '## ACTIVE MEMORY\nThe following are facts and preferences the user has previously saved. Use them to personalize your responses:\n\n';
  for (const [category, items] of Object.entries(grouped)) {
    block += `### ${category.toUpperCase().replace('_', ' ')}\n`;
    for (const item of items) {
      block += `- ${item}\n`;
    }
    block += '\n';
  }
  return block;
}
