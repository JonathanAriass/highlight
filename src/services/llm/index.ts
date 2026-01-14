import { LlamaProvider, releaseAllLLMContexts } from './LlamaProvider';
import { ModelManager, AVAILABLE_MODELS, DEFAULT_MODEL_ID } from './ModelManager';
import type { ILLMService } from './LLMService';

export type { ILLMService } from './LLMService';
export { LlamaProvider, releaseAllLLMContexts } from './LlamaProvider';
export { ModelManager, AVAILABLE_MODELS, DEFAULT_MODEL_ID } from './ModelManager';

let currentProvider: ILLMService | null = null;

export function getLLMProvider(modelId?: string): ILLMService {
  if (!currentProvider) {
    currentProvider = new LlamaProvider(modelId ?? DEFAULT_MODEL_ID);
  }
  return currentProvider;
}

export function setLLMProvider(provider: ILLMService): void {
  currentProvider = provider;
}

export async function resetLLMProvider(): Promise<void> {
  if (currentProvider) {
    await currentProvider.terminate();
    currentProvider = null;
  }
}
