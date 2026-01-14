import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getLLMProvider,
  resetLLMProvider,
  ModelManager,
  AVAILABLE_MODELS,
  type ILLMService,
} from '../services/llm';
import type { SummaryResult, ModelInfo, ModelDownloadProgress, TextBlock } from '../types';

interface UseLLMState {
  summary: SummaryResult | null;
  isProcessing: boolean;
  isModelLoading: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  streamingText: string;
  error: string | null;
  isReady: boolean;
  modelInfo: ModelInfo | null;
}

interface UseLLMOptions {
  autoInitialize?: boolean;
}

interface UseLLMReturn extends UseLLMState {
  summarize: (text: string, blocks?: TextBlock[]) => Promise<SummaryResult | null>;
  stopGeneration: () => void;
  downloadModel: (
    modelId?: string,
    onProgress?: (progress: ModelDownloadProgress) => void
  ) => Promise<boolean>;
  deleteModel: (modelId: string) => Promise<void>;
  getAvailableModels: () => typeof AVAILABLE_MODELS;
  getDownloadedModels: () => Promise<ModelInfo[]>;
  initializeWithModel: (modelId: string) => Promise<void>;
  reset: () => void;
}

export function useLLM(options: UseLLMOptions = {}): UseLLMReturn {
  const { autoInitialize = false } = options;
  const [state, setState] = useState<UseLLMState>({
    summary: null,
    isProcessing: false,
    isModelLoading: false,
    isDownloading: false,
    downloadProgress: 0,
    streamingText: '',
    error: null,
    isReady: false,
    modelInfo: null,
  });

  const providerRef = useRef<ILLMService | null>(null);
  const modelManagerRef = useRef<ModelManager>(new ModelManager());

  // Initialize provider on mount if autoInitialize is true and model is downloaded
  useEffect(() => {
    if (autoInitialize) {
      checkAndInitialize();
    }

    return () => {
      providerRef.current?.terminate();
    };
  }, [autoInitialize]);

  const checkAndInitialize = async () => {
    try {
      console.log('[useLLM] Checking if default model is downloaded...');
      // Check if default model is downloaded
      const defaultModelInfo = await modelManagerRef.current.getModelInfo('smollm2-360m');
      console.log('[useLLM] Model info:', defaultModelInfo);
      if (defaultModelInfo?.isDownloaded) {
        console.log('[useLLM] Model is downloaded, initializing provider...');
        await initializeProvider('smollm2-360m');
      } else {
        // Model not downloaded - user needs to download first
        console.log('[useLLM] Model not downloaded, user needs to download first');
        setState(prev => ({
          ...prev,
          modelInfo: defaultModelInfo,
          error: 'No model downloaded. Please download a model first.',
        }));
      }
    } catch (error) {
      console.error('[useLLM] Failed to check/initialize LLM:', error);
    }
  };

  const initializeProvider = async (modelId: string) => {
    try {
      console.log('[useLLM] initializeProvider called for:', modelId);
      setState(prev => ({ ...prev, isModelLoading: true, error: null }));

      // Reset existing provider if any
      await resetLLMProvider();

      providerRef.current = getLLMProvider(modelId);
      console.log('[useLLM] Calling provider.initialize()...');
      await providerRef.current.initialize((progress) => {
        console.log(`[useLLM] Loading model: ${progress.toFixed(0)}%`);
      });

      const info = await modelManagerRef.current.getModelInfo(modelId);
      console.log('[useLLM] Provider initialized successfully, setting isReady=true');

      setState(prev => ({
        ...prev,
        isReady: true,
        isModelLoading: false,
        modelInfo: info,
        error: null,
      }));
    } catch (error) {
      console.error('[useLLM] initializeProvider failed:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to initialize LLM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isModelLoading: false,
      }));
    }
  };

  const initializeWithModel = useCallback(async (modelId: string) => {
    await initializeProvider(modelId);
  }, []);

  const summarize = useCallback(async (text: string, blocks?: TextBlock[]): Promise<SummaryResult | null> => {
    console.log('[useLLM] summarize called, isReady:', state.isReady, 'hasProvider:', !!providerRef.current, 'hasBlocks:', !!blocks?.length);
    if (!providerRef.current || !state.isReady) {
      console.log('[useLLM] Cannot summarize - LLM not ready');
      setState(prev => ({ ...prev, error: 'LLM not initialized. Please download and load a model first.' }));
      return null;
    }

    console.log('[useLLM] Starting summarization, text length:', text.length, 'blocks:', blocks?.length ?? 0);
    setState(prev => ({
      ...prev,
      isProcessing: true,
      streamingText: '',
      error: null,
      summary: null,
    }));

    try {
      const result = await providerRef.current.summarize(text, (token) => {
        setState(prev => ({
          ...prev,
          streamingText: prev.streamingText + token,
        }));
      }, blocks);

      console.log('[useLLM] Summarization complete:', result?.text?.substring(0, 100));
      setState(prev => ({
        ...prev,
        summary: result,
        isProcessing: false,
        streamingText: '',
      }));

      return result;
    } catch (error) {
      console.error('[useLLM] Summarization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Summarization failed';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isProcessing: false,
        streamingText: '',
      }));
      return null;
    }
  }, [state.isReady]);

  const stopGeneration = useCallback(() => {
    providerRef.current?.stopGeneration();
  }, []);

  const downloadModel = useCallback(async (
    modelId: string = 'smollm2-360m',
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isDownloading: true, downloadProgress: 0, error: null }));

    try {
      await modelManagerRef.current.downloadModel(modelId, (progress) => {
        setState(prev => ({ ...prev, downloadProgress: progress.progress }));
        onProgress?.(progress);
      });

      // Refresh model info
      const info = await modelManagerRef.current.getModelInfo(modelId);
      setState(prev => ({
        ...prev,
        modelInfo: info,
        isDownloading: false,
        downloadProgress: 100,
      }));

      // Auto-initialize the provider after successful download
      console.log('[useLLM] Download complete, auto-initializing provider...');
      await initializeProvider(modelId);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      setState(prev => ({
        ...prev,
        error: message,
        isDownloading: false,
        downloadProgress: 0,
      }));
      return false;
    }
  }, []);

  const deleteModel = useCallback(async (modelId: string) => {
    await modelManagerRef.current.deleteModel(modelId);
    const info = await modelManagerRef.current.getModelInfo(modelId);
    setState(prev => ({ ...prev, modelInfo: info }));
  }, []);

  const getAvailableModels = useCallback(() => {
    return AVAILABLE_MODELS;
  }, []);

  const getDownloadedModels = useCallback(async () => {
    return modelManagerRef.current.getDownloadedModels();
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      summary: null,
      streamingText: '',
      error: null,
    }));
  }, []);

  return {
    ...state,
    summarize,
    stopGeneration,
    downloadModel,
    deleteModel,
    getAvailableModels,
    getDownloadedModels,
    initializeWithModel,
    reset,
  };
}
