import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OCRResultView } from '../components';
import { useScans, useOCR, useLLM } from '../hooks';
import type { RootStackParamList, Scan, TextBlock, BoundingBox } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ScanDetail'>;
type DetailRouteProp = RouteProp<RootStackParamList, 'ScanDetail'>;

export function ScanDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const { scanId } = route.params;

  const { getScanById, updateTextBlock, updateScanBlocks, deleteScan, saveSummary } = useScans();
  const { recognize, isProcessing } = useOCR();
  const {
    summary: llmSummary,
    isProcessing: isSummarizing,
    streamingText,
    isReady: isLLMReady,
    summarize,
    downloadModel,
    getDownloadedModels,
  } = useLLM({ autoInitialize: true });

  const [scan, setScan] = useState<Scan | null>(null);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const [displaySummary, setDisplaySummary] = useState<string | undefined>();

  useEffect(() => {
    const loadScan = async () => {
      const loadedScan = await getScanById(scanId);
      setScan(loadedScan);
      if (loadedScan) {
        setBlocks(loadedScan.blocks);
        setDisplaySummary(loadedScan.summary);
      }
      setIsLoading(false);
    };
    loadScan();
  }, [scanId, getScanById]);

  // Check if model is downloaded
  useEffect(() => {
    const checkModel = async () => {
      const downloaded = await getDownloadedModels();
      setIsModelDownloaded(downloaded.length > 0);
    };
    checkModel();
  }, [getDownloadedModels]);

  // Update displaySummary and save when new summary is generated
  useEffect(() => {
    if (llmSummary?.text) {
      setDisplaySummary(llmSummary.text);
      saveSummary(scanId, llmSummary.text, llmSummary.modelName);
    }
  }, [llmSummary, scanId, saveSummary]);

  const handleBlockUpdate = useCallback(
    async (blockId: string, correctedText: string) => {
      await updateTextBlock(blockId, correctedText);
      // Update local state
      setBlocks((prevBlocks) =>
        prevBlocks.map((block) =>
          block.id === blockId ? { ...block, correctedText } : block
        )
      );
    },
    [updateTextBlock]
  );

  const handleRegionScan = useCallback(async (region: BoundingBox) => {
    if (!scan) return;
    const regionResult = await recognize(scan.imageUri, region);
    if (regionResult) {
      const newBlocks = blocks.filter((block) => {
        const box = block.boundingBox;
        const overlaps =
          box.x < region.x + region.width &&
          box.x + box.width > region.x &&
          box.y < region.y + region.height &&
          box.y + box.height > region.y;
        return !overlaps;
      });
      const updatedBlocks = [...newBlocks, ...regionResult.blocks];
      setBlocks(updatedBlocks);
      // Save to database
      await updateScanBlocks(scanId, updatedBlocks);
    }
  }, [scan, blocks, recognize, scanId, updateScanBlocks]);

  const handleResummarize = useCallback(() => {
    const currentText = blocks
      .map((block) => block.correctedText || block.text)
      .join('\n');
    if (currentText.trim()) {
      // Pass blocks for better structured summarization
      summarize(currentText, blocks);
    }
  }, [blocks, summarize]);

  const handleDownloadModel = useCallback(async () => {
    try {
      await downloadModel();
      const downloaded = await getDownloadedModels();
      setIsModelDownloaded(downloaded.length > 0);
    } catch (err) {
      Alert.alert('Download Error', 'Failed to download model. Please try again.');
    }
  }, [downloadModel, getDownloadedModels]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Scan?',
      'Are you sure you want to delete this scan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteScan(scanId);
            navigation.goBack();
          },
        },
      ]
    );
  }, [scanId, deleteScan, navigation]);

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading scan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!scan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Scan not found</Text>
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backHomeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Scan Details</Text>
          <Text style={styles.date}>{formatDate(scan.createdAt)}</Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <OCRResultView
        imageUri={scan.imageUri}
        blocks={blocks}
        isProcessing={isProcessing}
        onBlockUpdate={handleBlockUpdate}
        onRegionScan={handleRegionScan}
        summary={displaySummary}
        isSummarizing={isSummarizing}
        streamingText={streamingText}
        onResummarize={handleResummarize}
        onDownloadModel={handleDownloadModel}
        isModelDownloaded={isModelDownloaded}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backHomeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backHomeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deleteButton: {
    paddingVertical: 8,
    paddingLeft: 16,
  },
  deleteButtonText: {
    fontSize: 20,
  },
});
