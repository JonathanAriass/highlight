import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OCRResultView } from '../components';
import { useOCR, useScans, useLLM } from '../hooks';
import type { RootStackParamList, TextBlock, BoundingBox } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scan'>;
type ScanRouteProp = RouteProp<RootStackParamList, 'Scan'>;

export function ScanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScanRouteProp>();
  const { imageUri } = route.params;

  const { recognize, result, isProcessing, error, isReady } = useOCR();
  const { createScan } = useScans();
  const {
    summary,
    isProcessing: isSummarizing,
    streamingText,
    isReady: isLLMReady,
    summarize,
    downloadModel,
    getDownloadedModels,
  } = useLLM({ autoInitialize: true });

  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const hasSummarized = useRef(false);

  // Run OCR when screen loads
  useEffect(() => {
    if (isReady && imageUri) {
      recognize(imageUri);
    }
  }, [isReady, imageUri, recognize]);

  // Update blocks when OCR result changes
  useEffect(() => {
    if (result) {
      setBlocks(result.blocks);
    }
  }, [result]);

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert('OCR Error', error, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [error, navigation]);

  // Check if model is downloaded
  useEffect(() => {
    const checkModel = async () => {
      const downloaded = await getDownloadedModels();
      console.log('[ScanScreen] Downloaded models:', downloaded.length, downloaded.map(m => m.id));
      setIsModelDownloaded(downloaded.length > 0);
    };
    checkModel();
  }, [getDownloadedModels]);

  // Auto-trigger summarization when OCR completes and LLM is ready
  useEffect(() => {
    console.log('[ScanScreen] Auto-summarize check:', {
      hasResult: !!result,
      isLLMReady,
      hasSummarized: hasSummarized.current,
      textLength: result?.text?.length ?? 0,
      blocksCount: result?.blocks?.length ?? 0,
    });
    if (result && isLLMReady && !hasSummarized.current && result.text.trim()) {
      console.log('[ScanScreen] Triggering auto-summarization with blocks...');
      hasSummarized.current = true;
      // Pass blocks for better structured summarization
      summarize(result.text, result.blocks);
    }
  }, [result, isLLMReady, summarize]);

  const handleBlockUpdate = useCallback((blockId: string, correctedText: string) => {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === blockId ? { ...block, correctedText } : block
      )
    );
  }, []);

  const handleResummarize = useCallback(() => {
    // Get the current text (with corrections applied)
    const currentText = blocks
      .map((block) => block.correctedText || block.text)
      .join('\n');
    if (currentText.trim()) {
      // Pass blocks for better structured summarization
      summarize(currentText, blocks);
    }
  }, [blocks, summarize]);

  const handleDownloadModel = useCallback(async () => {
    console.log('[ScanScreen] handleDownloadModel called - starting download...');
    try {
      await downloadModel();
      console.log('[ScanScreen] Download complete, checking models...');
      const downloaded = await getDownloadedModels();
      console.log('[ScanScreen] Models after download:', downloaded.length);
      setIsModelDownloaded(downloaded.length > 0);
    } catch (err) {
      console.error('[ScanScreen] Download failed:', err);
      Alert.alert('Download Error', 'Failed to download model. Please try again.');
    }
  }, [downloadModel, getDownloadedModels]);

  const handleRegionScan = useCallback(async (region: BoundingBox) => {
    const regionResult = await recognize(imageUri, region);
    if (regionResult) {
      setBlocks((prevBlocks) => {
        // Remove blocks that overlap with the selected region
        const blocksOutsideRegion = prevBlocks.filter((block) => {
          const box = block.boundingBox;
          // Check if block overlaps with selected region
          const overlaps =
            box.x < region.x + region.width &&
            box.x + box.width > region.x &&
            box.y < region.y + region.height &&
            box.y + box.height > region.y;
          return !overlaps;
        });
        // Add new blocks from region scan
        return [...blocksOutsideRegion, ...regionResult.blocks];
      });
    }
  }, [imageUri, recognize]);

  const handleSave = useCallback(async () => {
    if (!result) return;

    const scan = await createScan(imageUri, result.text, blocks);
    if (scan) {
      setIsSaved(true);
      Alert.alert('Saved', 'Scan saved successfully!', [
        {
          text: 'View',
          onPress: () => {
            navigation.replace('ScanDetail', { scanId: scan.id });
          },
        },
        {
          text: 'New Scan',
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  }, [result, imageUri, blocks, createScan, navigation]);

  const handleDiscard = useCallback(() => {
    Alert.alert(
      'Discard Scan?',
      'Are you sure you want to discard this scan? Any corrections will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscard} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan Result</Text>
        <View style={styles.headerSpacer} />
      </View>

      <OCRResultView
        imageUri={imageUri}
        blocks={blocks}
        isProcessing={isProcessing || !isReady}
        onBlockUpdate={handleBlockUpdate}
        onRegionScan={handleRegionScan}
        onSelectionModeChange={setIsSelectionMode}
        summary={summary?.text}
        isSummarizing={isSummarizing}
        streamingText={streamingText}
        onResummarize={handleResummarize}
        onDownloadModel={handleDownloadModel}
        isModelDownloaded={isModelDownloaded}
      />

      {!isProcessing && result && !isSelectionMode && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.discardButton}
            onPress={handleDiscard}
          >
            <Text style={styles.discardButtonText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, isSaved && styles.savedButton]}
            onPress={handleSave}
            disabled={isSaved}
          >
            <Text style={styles.saveButtonText}>
              {isSaved ? 'Saved ✓' : 'Save Scan'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 60,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  discardButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  discardButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  savedButton: {
    backgroundColor: '#34C759',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
