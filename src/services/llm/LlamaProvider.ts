import { initLlama, releaseAllLlama, type LlamaContext } from 'llama.rn';
import type { ILLMService } from './LLMService';
import type { SummaryResult, TextBlock } from '../../types';
import { ModelManager, DEFAULT_MODEL_ID, AVAILABLE_MODELS } from './ModelManager';
import { createStructuredPrompt } from './textPreprocessor';

// Simpler prompt works better with small models
const SUMMARIZE_SYSTEM_PROMPT = `You summarize text. Be brief and direct. Write 1-3 sentences.`;

const STOP_WORDS = ['</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>', '<|EOT|>', '<|endoftext|>', '<|assistant|>'];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export class LlamaProvider implements ILLMService {
  private context: LlamaContext | null = null;
  private ready = false;
  private loading = false;
  private modelManager: ModelManager;
  private modelId: string;
  private stopRequested = false;

  constructor(modelId: string = DEFAULT_MODEL_ID) {
    this.modelId = modelId;
    this.modelManager = new ModelManager();
  }

  getName(): string {
    return 'llama.rn';
  }

  getModelName(): string {
    const model = AVAILABLE_MODELS.find(m => m.id === this.modelId);
    return model?.name ?? this.modelId;
  }

  isReady(): boolean {
    return this.ready;
  }

  isLoading(): boolean {
    return this.loading;
  }

  async initialize(onProgress?: (progress: number) => void): Promise<void> {
    if (this.ready || this.loading) return;

    this.loading = true;

    try {
      // Check if model is downloaded
      const modelInfo = await this.modelManager.getModelInfo(this.modelId);
      if (!modelInfo?.isDownloaded || !modelInfo.localPath) {
        throw new Error(`Model ${this.modelId} not downloaded. Please download it first.`);
      }

      console.log(`Initializing LLM with model: ${modelInfo.localPath}`);

      // Initialize llama context
      this.context = await initLlama(
        {
          model: modelInfo.localPath,
          n_ctx: 2048,           // Context window
          n_gpu_layers: 99,      // Use GPU acceleration if available
          n_threads: 4,          // CPU threads
          use_mlock: true,       // Lock in RAM
          use_mmap: true,        // Memory mapping
        },
        (progress) => {
          onProgress?.(progress * 100);
        }
      );

      console.log(`LLM initialized, GPU: ${this.context.gpu}`);
      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async summarize(
    text: string,
    onToken?: (token: string) => void,
    blocks?: TextBlock[]
  ): Promise<SummaryResult> {
    console.log('[LlamaProvider] summarize called, ready:', this.ready, 'hasContext:', !!this.context);
    if (!this.context || !this.ready) {
      throw new Error('LLM not initialized');
    }

    this.stopRequested = false;

    // Use structured preprocessing if blocks are available
    let processedText: string;
    if (blocks && blocks.length > 0) {
      processedText = createStructuredPrompt(blocks, text);
      console.log('[LlamaProvider] Using structured text from blocks');
    } else {
      processedText = text;
    }

    // Truncate text if too long (leave room for prompt and response)
    const maxInputLength = 1500;
    const truncatedText = processedText.length > maxInputLength
      ? processedText.substring(0, maxInputLength) + '...'
      : processedText;

    console.log(`[LlamaProvider] Summarizing text (${truncatedText.length} chars)`);
    console.log(`[LlamaProvider] Input preview: "${truncatedText.substring(0, 150)}..."`);

    try {
      // Use few-shot examples for better results with small models
      const result = await this.context.completion(
        {
          messages: [
            { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
            // Few-shot example 1 - Receipt
            { role: 'user', content: 'Summarize: [RECEIPT]\nWALMART\n123 Main St\nMilk $3.99\nBread $2.50\nTotal: $6.49\n\nKey information:\n- Total: $6.49\n- Milk: $3.99' },
            { role: 'assistant', content: 'Walmart receipt totaling $6.49 for milk ($3.99) and bread ($2.50).' },
            // Few-shot example 2 - Business card
            { role: 'user', content: 'Summarize: [BUSINESS CARD]\nJohn Smith\nSoftware Engineer\nAcme Corp\njohn@acme.com\n555-123-4567' },
            { role: 'assistant', content: 'Business card for John Smith, Software Engineer at Acme Corp. Contact: john@acme.com, 555-123-4567.' },
            // Few-shot example 3 - General document
            { role: 'user', content: 'Summarize: Meeting Notes\nDate: Jan 15\nAttendees: Sarah, Mike\nDiscussed Q4 budget and hiring plan.\nAction: Sarah to send report Friday.' },
            { role: 'assistant', content: 'Meeting notes from Jan 15 with Sarah and Mike about Q4 budget and hiring. Sarah will send report by Friday.' },
            // Actual request
            { role: 'user', content: `Summarize: ${truncatedText}` },
          ],
          n_predict: 150,        // Shorter output for concise summaries
          stop: STOP_WORDS,
          temperature: 0.3,      // Lower = more focused/deterministic
          top_p: 0.9,
          repeat_penalty: 1.1,   // Reduce repetition
        },
        (data) => {
          if (this.stopRequested) {
            return;
          }
          if (data.token) {
            onToken?.(data.token);
          }
        }
      );

      const summaryText = result.text?.trim() || '';
      console.log(`Summary generated: ${summaryText.length} chars`);

      return {
        id: generateId(),
        text: summaryText,
        generatedAt: Date.now(),
        modelName: this.getModelName(),
        promptTokens: result.timings?.prompt_n,
        completionTokens: result.timings?.predicted_n,
      };
    } catch (error) {
      if (this.stopRequested) {
        throw new Error('Generation stopped by user');
      }
      throw error;
    }
  }

  stopGeneration(): void {
    this.stopRequested = true;
    this.context?.stopCompletion();
  }

  async terminate(): Promise<void> {
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.ready = false;
    }
  }
}

// Singleton cleanup function
export async function releaseAllLLMContexts(): Promise<void> {
  await releaseAllLlama();
}
