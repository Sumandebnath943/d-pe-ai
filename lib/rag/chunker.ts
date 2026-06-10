/**
 * Text chunker — splits extracted text into overlapping segments
 * suitable for retrieval. Respects paragraph and sentence boundaries.
 */

import { Chunk } from '../types';

const DEFAULT_CHUNK_SIZE = 500;  // target tokens per chunk
const DEFAULT_OVERLAP = 50;      // overlap tokens between chunks

function estimateTokens(text: string): number {
  // Rough approximation: ~1 token per 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Split text into sentence-like segments.
 */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);
}

/**
 * Chunk a text string into overlapping segments.
 * Each chunk targets ~chunkSize tokens with ~overlap tokens shared with the next.
 */
export function chunkText(
  text: string,
  datasetId: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP
): Chunk[] {
  // First split by paragraphs (double newline), then by sentences within
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 0);
  const allSentences: string[] = [];

  for (const para of paragraphs) {
    const sentences = splitSentences(para.trim());
    allSentences.push(...sentences);
    // Add a paragraph break marker
    allSentences.push('\n');
  }

  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  for (let i = 0; i < allSentences.length; i++) {
    const sentence = allSentences[i];
    const sentenceTokens = estimateTokens(sentence);

    // If adding this sentence would exceed the target size and we already have content
    if (currentTokens + sentenceTokens > chunkSize && currentChunk.length > 0) {
      // Emit current chunk
      const chunkText = currentChunk.join(' ').replace(/\s*\n\s*/g, '\n\n').trim();
      if (chunkText.length > 10) {
        chunks.push({
          id: `chunk-${datasetId}-${chunkIndex}`,
          datasetId,
          text: chunkText,
          index: chunkIndex,
        });
        chunkIndex++;
      }

      // Calculate overlap: keep last N tokens worth of sentences
      let overlapTokens = 0;
      let overlapStart = currentChunk.length;
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        overlapTokens += estimateTokens(currentChunk[j]);
        if (overlapTokens >= overlap) {
          overlapStart = j;
          break;
        }
      }

      currentChunk = currentChunk.slice(overlapStart);
      currentTokens = currentChunk.reduce((sum, s) => sum + estimateTokens(s), 0);
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;
  }

  // Emit final chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ').replace(/\s*\n\s*/g, '\n\n').trim();
    if (chunkText.length > 10) {
      chunks.push({
        id: `chunk-${datasetId}-${chunkIndex}`,
        datasetId,
        text: chunkText,
        index: chunkIndex,
      });
    }
  }

  return chunks;
}
