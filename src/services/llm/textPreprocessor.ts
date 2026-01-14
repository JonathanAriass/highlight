import type { TextBlock } from '../../types';

/**
 * Preprocesses OCR text blocks into structured, LLM-friendly text.
 * Uses bounding box information to preserve reading order and structure.
 */

interface Line {
  y: number;
  blocks: TextBlock[];
}

/**
 * Groups text blocks into lines based on vertical position.
 * Blocks within similar Y coordinates are considered same line.
 */
function groupIntoLines(blocks: TextBlock[], lineThreshold = 15): Line[] {
  if (blocks.length === 0) return [];

  // Sort by Y position first
  const sorted = [...blocks].sort((a, b) => a.boundingBox.y - b.boundingBox.y);

  const lines: Line[] = [];
  let currentLine: Line = { y: sorted[0].boundingBox.y, blocks: [sorted[0]] };

  for (let i = 1; i < sorted.length; i++) {
    const block = sorted[i];
    const yDiff = Math.abs(block.boundingBox.y - currentLine.y);

    if (yDiff <= lineThreshold) {
      // Same line
      currentLine.blocks.push(block);
    } else {
      // New line - sort current line by X position first
      currentLine.blocks.sort((a, b) => a.boundingBox.x - b.boundingBox.x);
      lines.push(currentLine);
      currentLine = { y: block.boundingBox.y, blocks: [block] };
    }
  }

  // Don't forget last line
  currentLine.blocks.sort((a, b) => a.boundingBox.x - b.boundingBox.x);
  lines.push(currentLine);

  return lines;
}

/**
 * Detects if text looks like a key-value pair (e.g., "Total: $5.99")
 */
function detectKeyValue(text: string): { key: string; value: string } | null {
  // Pattern: "Key: Value" or "Key Value" where Value starts with number or $
  const colonMatch = text.match(/^([^:]+):\s*(.+)$/);
  if (colonMatch) {
    return { key: colonMatch[1].trim(), value: colonMatch[2].trim() };
  }

  // Pattern: "Label $XX.XX" or "Label XX.XX"
  const priceMatch = text.match(/^(.+?)\s+(\$?\d+[.,]\d{2})$/);
  if (priceMatch) {
    return { key: priceMatch[1].trim(), value: priceMatch[2].trim() };
  }

  return null;
}

/**
 * Detects document type based on content patterns
 */
function detectDocumentType(text: string): string {
  const lowerText = text.toLowerCase();

  // Receipt patterns
  if (
    (lowerText.includes('total') || lowerText.includes('subtotal')) &&
    (lowerText.includes('$') || /\d+[.,]\d{2}/.test(text))
  ) {
    return 'receipt';
  }

  // Business card patterns
  if (
    (lowerText.includes('@') || lowerText.includes('email')) &&
    (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text) || lowerText.includes('phone'))
  ) {
    return 'business_card';
  }

  // Menu patterns
  if (
    text.split('\n').filter(line => /\$?\d+[.,]\d{2}/.test(line)).length >= 3
  ) {
    return 'menu_or_price_list';
  }

  // Letter/document patterns
  if (
    lowerText.includes('dear ') ||
    lowerText.includes('sincerely') ||
    lowerText.includes('regards')
  ) {
    return 'letter';
  }

  return 'document';
}

/**
 * Main preprocessing function - converts raw OCR blocks into structured text
 */
export function preprocessForLLM(blocks: TextBlock[], rawText?: string): string {
  if (blocks.length === 0) {
    return rawText?.trim() || '';
  }

  // Group blocks into lines
  const lines = groupIntoLines(blocks);

  // Reconstruct text with proper line structure
  const structuredLines: string[] = [];

  for (const line of lines) {
    const lineText = line.blocks
      .map(b => (b.correctedText || b.text).trim())
      .filter(t => t.length > 0)
      .join(' ');

    if (lineText) {
      structuredLines.push(lineText);
    }
  }

  const structuredText = structuredLines.join('\n');

  // Detect document type
  const docType = detectDocumentType(structuredText);

  // Build final prompt-ready text
  let result = '';

  // Add document type hint for LLM
  if (docType !== 'document') {
    result += `[${docType.toUpperCase().replace('_', ' ')}]\n`;
  }

  result += structuredText;

  return result;
}

/**
 * Extracts key information based on document type
 */
export function extractKeyInfo(blocks: TextBlock[]): Record<string, string> {
  const info: Record<string, string> = {};
  const lines = groupIntoLines(blocks);

  for (const line of lines) {
    const lineText = line.blocks.map(b => b.correctedText || b.text).join(' ');
    const kv = detectKeyValue(lineText);
    if (kv) {
      info[kv.key] = kv.value;
    }
  }

  return info;
}

/**
 * Creates a concise summary prompt based on extracted structure
 */
export function createStructuredPrompt(blocks: TextBlock[], rawText?: string): string {
  const preprocessed = preprocessForLLM(blocks, rawText);
  const keyInfo = extractKeyInfo(blocks);

  // If we found key-value pairs, add them as structured context
  const keyInfoEntries = Object.entries(keyInfo);
  if (keyInfoEntries.length >= 2) {
    let structured = preprocessed + '\n\nKey information:\n';
    for (const [key, value] of keyInfoEntries.slice(0, 5)) {
      structured += `- ${key}: ${value}\n`;
    }
    return structured;
  }

  return preprocessed;
}
