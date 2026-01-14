import { useState, useCallback, useEffect, useRef } from 'react';
import { getOCRProvider, type IOCRService } from '../services/ocr';
import type { OCRResult } from '../types';

interface UseOCRState {
  result: OCRResult | null;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  isReady: boolean;
}

interface UseOCRReturn extends UseOCRState {
  recognize: (imageUri: string) => Promise<OCRResult | null>;
  reset: () => void;
}

export function useOCR(): UseOCRReturn {
  const [state, setState] = useState<UseOCRState>({
    result: null,
    isProcessing: false,
    progress: 0,
    error: null,
    isReady: false,
  });

  const providerRef = useRef<IOCRService | null>(null);

  useEffect(() => {
    const initializeProvider = async () => {
      try {
        providerRef.current = getOCRProvider();
        await providerRef.current.initialize();
        setState((prev) => ({ ...prev, isReady: true }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: `Failed to initialize OCR: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }));
      }
    };

    initializeProvider();

    return () => {
      providerRef.current?.terminate();
    };
  }, []);

  const recognize = useCallback(async (imageUri: string): Promise<OCRResult | null> => {
    if (!providerRef.current) {
      setState((prev) => ({ ...prev, error: 'OCR provider not initialized' }));
      return null;
    }

    setState((prev) => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      error: null,
      result: null,
    }));

    try {
      const result = await providerRef.current.recognize(imageUri);
      setState((prev) => ({
        ...prev,
        result,
        isProcessing: false,
        progress: 100,
      }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OCR recognition failed';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isProcessing: false,
      }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      result: null,
      progress: 0,
      error: null,
    }));
  }, []);

  return {
    ...state,
    recognize,
    reset,
  };
}
