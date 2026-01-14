import { createWorker, Worker, RecognizeResult } from 'tesseract.js';
import { generateId } from '../../utils/id';
import type { IOCRService } from './OCRService';
import type { OCRResult, TextBlock, BoundingBox } from '../../types';

// Extended types for Tesseract.js result data
interface TesseractWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface TesseractLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words: TesseractWord[];
}

interface TesseractBlock {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  lines: TesseractLine[];
}

interface TesseractData {
  text: string;
  confidence: number;
  blocks?: TesseractBlock[];
  lines?: TesseractLine[];
  words?: TesseractWord[];
}

/**
 * Tesseract.js OCR provider implementation.
 *
 * Note: Tesseract.js works best in web environments. For React Native,
 * you may need to use a WebView-based approach or consider alternatives
 * like ML Kit for production use.
 */
export class TesseractProvider implements IOCRService {
  private worker: Worker | null = null;
  private ready = false;
  private language: string;

  constructor(language: string = 'eng') {
    this.language = language;
  }

  getName(): string {
    return 'Tesseract.js';
  }

  isReady(): boolean {
    return this.ready;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;

    try {
      this.worker = await createWorker(this.language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize Tesseract worker:', error);
      throw error;
    }
  }

  async recognize(imageUri: string): Promise<OCRResult> {
    if (!this.worker || !this.ready) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('Tesseract worker not initialized');
    }

    try {
      const result: RecognizeResult = await this.worker.recognize(imageUri);
      return this.transformResult(result);
    } catch (error) {
      console.error('OCR recognition failed:', error);
      throw error;
    }
  }

  private transformResult(result: RecognizeResult): OCRResult {
    const blocks: TextBlock[] = [];
    const data = result.data as unknown as TesseractData;

    // Try to extract words from blocks -> lines -> words hierarchy
    if (data.blocks && data.blocks.length > 0) {
      for (const block of data.blocks) {
        if (block.lines) {
          for (const line of block.lines) {
            if (line.words) {
              for (const word of line.words) {
                if (word.text.trim()) {
                  const boundingBox: BoundingBox = {
                    x: word.bbox.x0,
                    y: word.bbox.y0,
                    width: word.bbox.x1 - word.bbox.x0,
                    height: word.bbox.y1 - word.bbox.y0,
                  };

                  blocks.push({
                    id: generateId(),
                    text: word.text,
                    boundingBox,
                    confidence: word.confidence / 100,
                  });
                }
              }
            }
          }
        }
      }
    }

    // Fallback: try direct words array
    if (blocks.length === 0 && data.words) {
      for (const word of data.words) {
        if (word.text.trim()) {
          const boundingBox: BoundingBox = {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
          };

          blocks.push({
            id: generateId(),
            text: word.text,
            boundingBox,
            confidence: word.confidence / 100,
          });
        }
      }
    }

    // Fallback: use lines if no words found
    if (blocks.length === 0 && data.lines) {
      for (const line of data.lines) {
        if (line.text.trim()) {
          const boundingBox: BoundingBox = {
            x: line.bbox.x0,
            y: line.bbox.y0,
            width: line.bbox.x1 - line.bbox.x0,
            height: line.bbox.y1 - line.bbox.y0,
          };

          blocks.push({
            id: generateId(),
            text: line.text.trim(),
            boundingBox,
            confidence: line.confidence / 100,
          });
        }
      }
    }

    return {
      text: data.text,
      blocks,
      confidence: data.confidence / 100,
    };
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }
}
