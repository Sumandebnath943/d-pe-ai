/**
 * Client-side file parser — extracts text from various file formats.
 * PDFs and DOCX files are sent to the server-side API route for parsing.
 */

export async function parseFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'txt':
    case 'md':
      return await file.text();

    case 'csv':
      return parseCsv(await file.text());

    case 'json':
      return parseJson(await file.text());

    case 'pdf':
    case 'docx':
      return await parseServerSide(file);

    default:
      throw new Error(`Unsupported file format: .${ext}. Supported formats: .txt, .md, .csv, .json, .pdf, .docx`);
  }
}

/**
 * Convert CSV text into readable prose blocks.
 */
function parseCsv(text: string): string {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return '';

  // First line is headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const pairs = headers.map((h, idx) => `${h}: ${values[idx] || ''}`);
    rows.push(pairs.join(' | '));
  }

  return `Table with columns: ${headers.join(', ')}\n\n${rows.join('\n')}`;
}

/**
 * Convert JSON into readable text. Handles arrays of objects and nested structures.
 */
function parseJson(text: string): string {
  try {
    const data = JSON.parse(text);

    if (Array.isArray(data)) {
      return data.map((item, i) => {
        if (typeof item === 'object' && item !== null) {
          const pairs = Object.entries(item).map(([k, v]) => `${k}: ${String(v)}`);
          return `Record ${i + 1}: ${pairs.join(' | ')}`;
        }
        return String(item);
      }).join('\n\n');
    }

    if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  } catch {
    // If JSON parsing fails, return raw text
    return text;
  }
}

/**
 * Send file to the server for parsing (PDF, DOCX).
 */
async function parseServerSide(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/parse-file', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to parse file.' }));
    throw new Error(err.error || 'Failed to parse file on server.');
  }

  const result = await response.json();
  return result.text;
}

/**
 * Validate a file before processing.
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
  const ALLOWED_EXTENSIONS = ['txt', 'md', 'csv', 'json', 'pdf', 'docx'];

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported format: .${ext}. Supported: ${ALLOWED_EXTENSIONS.map(e => `.${e}`).join(', ')}`,
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 25MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  return { valid: true };
}
