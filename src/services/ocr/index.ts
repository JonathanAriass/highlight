import { CloudVisionProvider } from './CloudVisionProvider';
import type { IOCRService } from './OCRService';

export type { IOCRService } from './OCRService';
export { TesseractProvider } from './TesseractProvider';
export { CloudVisionProvider } from './CloudVisionProvider';

// Default OCR provider - can be swapped for other implementations
let currentProvider: IOCRService | null = null;

export function getOCRProvider(): IOCRService {
  if (!currentProvider) {
    // Use cloud-based OCR (works on iOS/Android/Web)
    // Get your own free API key at: https://ocr.space/ocrapi/freekey
    currentProvider = new CloudVisionProvider();
  }
  return currentProvider;
}

export function setOCRProvider(provider: IOCRService): void {
  currentProvider = provider;
}
