import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { ScanRepository } from '../services/database';
import type { Scan, TextBlock } from '../types';

interface UseScansReturn {
  scans: Scan[];
  isLoading: boolean;
  error: string | null;
  createScan: (imageUri: string, fullText: string, blocks: TextBlock[]) => Promise<Scan | null>;
  getScanById: (id: string) => Promise<Scan | null>;
  updateTextBlock: (blockId: string, correctedText: string) => Promise<void>;
  updateScanBlocks: (scanId: string, blocks: TextBlock[]) => Promise<void>;
  deleteScan: (id: string) => Promise<void>;
  refreshScans: () => Promise<void>;
  saveSummary: (scanId: string, summaryText: string, modelName: string) => Promise<void>;
}

export function useScans(): UseScansReturn {
  const db = useSQLiteContext();
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repository] = useState(() => new ScanRepository(db));

  const refreshScans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allScans = await repository.getAllScans();
      setScans(allScans);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load scans';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    refreshScans();
  }, [refreshScans]);

  const createScan = useCallback(
    async (imageUri: string, fullText: string, blocks: TextBlock[]): Promise<Scan | null> => {
      try {
        const scan = await repository.createScan(imageUri, fullText, blocks);
        setScans((prev) => [scan, ...prev]);
        return scan;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create scan';
        setError(message);
        return null;
      }
    },
    [repository]
  );

  const getScanById = useCallback(
    async (id: string): Promise<Scan | null> => {
      try {
        return await repository.getScanById(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get scan';
        setError(message);
        return null;
      }
    },
    [repository]
  );

  const updateTextBlock = useCallback(
    async (blockId: string, correctedText: string): Promise<void> => {
      try {
        await repository.updateTextBlock(blockId, correctedText);
        await refreshScans();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update text block';
        setError(message);
      }
    },
    [repository, refreshScans]
  );

  const updateScanBlocks = useCallback(
    async (scanId: string, blocks: TextBlock[]): Promise<void> => {
      try {
        await repository.updateScanBlocks(scanId, blocks);
        await refreshScans();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update scan blocks';
        setError(message);
      }
    },
    [repository, refreshScans]
  );

  const deleteScan = useCallback(
    async (id: string): Promise<void> => {
      try {
        await repository.deleteScan(id);
        setScans((prev) => prev.filter((scan) => scan.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete scan';
        setError(message);
      }
    },
    [repository]
  );

  const saveSummary = useCallback(
    async (scanId: string, summaryText: string, modelName: string): Promise<void> => {
      try {
        await repository.saveSummary(scanId, summaryText, modelName);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save summary';
        setError(message);
      }
    },
    [repository]
  );

  return {
    scans,
    isLoading,
    error,
    createScan,
    getScanById,
    updateTextBlock,
    updateScanBlocks,
    deleteScan,
    refreshScans,
    saveSummary,
  };
}
