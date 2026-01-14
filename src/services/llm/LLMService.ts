import type { SummaryResult, TextBlock } from '../../types';

/**
 * Interface for LLM service providers
 * Follows the same pattern as IOCRService for consistency
 */
export interface ILLMService {
  /**
   * Generate a summary of the provided text
   * @param text - The text to summarize
   * @param onToken - Optional callback for streaming tokens
   * @param blocks - Optional OCR text blocks with bounding boxes for better structuring
   * @returns Summary result with generated text
   */
  summarize(
    text: string,
    onToken?: (token: string) => void,
    blocks?: TextBlock[]
  ): Promise<SummaryResult>;

  /**
   * Get the name of this LLM provider
   */
  getName(): string;

  /**
   * Get the model name currently loaded
   */
  getModelName(): string;

  /**
   * Check if the provider is ready (model loaded)
   */
  isReady(): boolean;

  /**
   * Check if model is currently loading
   */
  isLoading(): boolean;

  /**
   * Initialize the LLM provider (load model)
   * @param onProgress - Progress callback for model loading (0-100)
   */
  initialize(onProgress?: (progress: number) => void): Promise<void>;

  /**
   * Clean up resources (release model context)
   */
  terminate(): Promise<void>;

  /**
   * Stop any ongoing generation
   */
  stopGeneration(): void;
}
