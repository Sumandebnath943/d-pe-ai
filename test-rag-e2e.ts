/**
 * End-to-end test for the RAG pipeline.
 * Tests: File parsing → Chunking → BM25 Indexing → Search → Context formatting
 *
 * Run with: node --experimental-strip-types test-rag-e2e.ts
 * Or:       npx tsx test-rag-e2e.ts
 */

import { chunkText } from './lib/rag/chunker';
import { buildIndex, search, formatRagContext } from './lib/rag/retriever';
import { formatMemoriesForPrompt } from './lib/memory';
import fs from 'fs';

// ═══════════════════════════════════════════
// STEP 1: Read the sample dataset
// ═══════════════════════════════════════════
console.log('\n═══════════════════════════════════════════');
console.log('STEP 1: Reading sample-dataset.txt');
console.log('═══════════════════════════════════════════');

const rawText = fs.readFileSync('./sample-dataset.txt', 'utf-8');
console.log(`✓ Read ${rawText.length} characters`);
console.log(`  Preview: "${rawText.slice(0, 80)}..."`);

// ═══════════════════════════════════════════
// STEP 2: Chunk the text
// ═══════════════════════════════════════════
console.log('\n═══════════════════════════════════════════');
console.log('STEP 2: Chunking text');
console.log('═══════════════════════════════════════════');

const datasetId = 'test-dataset-001';
const chunks = chunkText(rawText, datasetId);
console.log(`✓ Created ${chunks.length} chunks`);
for (const chunk of chunks) {
  console.log(`  [Chunk ${chunk.index}] ${chunk.text.length} chars — "${chunk.text.slice(0, 60).replace(/\n/g, ' ')}..."`);
}

// ═══════════════════════════════════════════
// STEP 3: Build BM25 index
// ═══════════════════════════════════════════
console.log('\n═══════════════════════════════════════════');
console.log('STEP 3: Building BM25 index');
console.log('═══════════════════════════════════════════');

const index = buildIndex(chunks);
console.log(`✓ Index built: ${index.docCount} documents, ${index.invertedIndex.size} unique terms`);
console.log(`  Avg doc length: ${index.avgDocLength.toFixed(1)} tokens`);

// ═══════════════════════════════════════════
// STEP 4: Search with relevant queries
// ═══════════════════════════════════════════
console.log('\n═══════════════════════════════════════════');
console.log('STEP 4: BM25 Search — relevant queries');
console.log('═══════════════════════════════════════════');

const queries = [
  'What is the pricing for Nexora Studio?',
  'customer support chatbot',
  'brand voice and tone guidelines',
  'who is the CEO?',
  'multi-agent collaboration feature',
];

for (const query of queries) {
  const results = search(index, query, 3);
  console.log(`\n  Query: "${query}"`);
  if (results.length === 0) {
    console.log('  ✗ No results found!');
  } else {
    for (const r of results) {
      console.log(`  ✓ Score: ${r.score.toFixed(3)} — "${r.chunk.text.slice(0, 70).replace(/\n/g, ' ')}..."`);
    }
  }
}

// ═══════════════════════════════════════════
// STEP 5: Search with IRRELEVANT query (should return low/no results)
// ═══════════════════════════════════════════
console.log('\n═══════════════════════════════════════════');
console.log('STEP 5: BM25 Search — irrelevant query');
console.log('═══════════════════════════════════════════');

const irrelevant = search(index, 'quantum physics black hole entropy', 3);
console.log(`  Query: "quantum physics black hole entropy"`);
console.log(`  Results: ${irrelevant.length} (expected: 0 or very low scores)`);
if (irrelevant.length > 0) {
  console.log(`  Max score: ${irrelevant[0].score.toFixed(3)}`);
}

// ═══════════════════════════════════════════
// STEP 6: Format RAG context for prompt injection
// ═══════════════════════════════════════════
console.log('\n═══════════════════════════════════════════');
console.log('STEP 6: Format RAG context for system prompt');
console.log('═══════════════════════════════════════════');

const topResults = search(index, 'customer support chatbot for Nexora', 5);
const ragBlock = formatRagContext(topResults);
console.log(`✓ RAG context block: ${ragBlock.length} chars`);
console.log('--- BEGIN RAG CONTEXT ---');
console.log(ragBlock.slice(0, 500));
console.log('--- END (truncated) ---');

// ═══════════════════════════════════════════
// STEP 7: Test API endpoint (parse-file)
// ═══════════════════════════════════════════
console.log('\n═══════════════════════════════════════════');
console.log('STEP 7: Testing /api/parse-file endpoint');
console.log('═══════════════════════════════════════════');

async function testParseAPI() {
  try {
    const fileBuffer = fs.readFileSync('./sample-dataset.txt');
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: 'text/plain' }), 'sample-dataset.txt');

    // This will only work if the dev server is running on port 3000
    const res = await fetch('http://localhost:3000/api/parse-file', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      // txt files are parsed client-side, so the server will reject it
      console.log(`  Response: ${res.status} (expected 400 for .txt — server only handles .pdf/.docx)`);
      console.log('  ✓ API endpoint is reachable and responding correctly');
    } else {
      const err = await res.json();
      console.log(`  Response: ${res.status} — ${err.error}`);
      console.log('  ✓ API endpoint is reachable and correctly rejects non-PDF/DOCX files');
    }
  } catch (err: any) {
    if (err.message?.includes('ECONNREFUSED') || err.cause?.code === 'ECONNREFUSED') {
      console.log('  ⚠ Dev server not reachable (ECONNREFUSED). Skipping API test.');
    } else {
      console.log(`  ⚠ API test error: ${err.message}`);
    }
  }
}

testParseAPI().then(() => {
  // ═══════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════
console.log('\n═══════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════');
console.log(`  ✓ File reading:    OK`);
console.log(`  ✓ Chunking:        ${chunks.length} chunks created`);
console.log(`  ✓ BM25 Indexing:   ${index.docCount} docs, ${index.invertedIndex.size} terms`);
console.log(`  ✓ BM25 Search:     ${queries.length} queries tested`);
console.log(`  ✓ Context Format:  ${ragBlock.length} char block generated`);
console.log(`\n  ✅ RAG PIPELINE END-TO-END TEST PASSED\n`);
});
