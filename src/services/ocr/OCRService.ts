import type { OCRResult, BoundingBox } from '../../types';

/**
 * Abstract interface for OCR providers.
 * Implement this interface to add new OCR backends.
 */
export interface IOCRService {
  /**
   * Recognize text from an image
   * @param imageUri - Local URI of the image to process
   * @param cropRegion - Optional region to crop before OCR (coordinates in original image space)
   * @returns OCR result with detected text blocks and bounding boxes
   */
  recognize(imageUri: string, cropRegion?: BoundingBox): Promise<OCRResult>;

  /**
   * Get the name of this OCR provider
   */
  getName(): string;

  /**
   * Check if the provider is ready (e.g., models loaded)
   */
  isReady(): boolean;

  /**
   * Initialize the OCR provider (load models, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Clean up resources
   */
  terminate(): Promise<void>;
}
