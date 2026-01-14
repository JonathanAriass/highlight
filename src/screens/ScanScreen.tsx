import React, { useEffect, useState, useCallback } from 'react';
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
import { useOCR, useScans } from '../hooks';
import type { RootStackParamList, TextBlock } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scan'>;
type ScanRouteProp = RouteProp<RootStackParamList, 'Scan'>;

export function ScanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScanRouteProp>();
  const { imageUri } = route.params;

  const { recognize, result, isProcessing, error, isReady } = useOCR();
  const { createScan } = useScans();

  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [isSaved, setIsSaved] = useState(false);

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

  const handleBlockUpdate = useCallback((blockId: string, correctedText: string) => {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === blockId ? { ...block, correctedText } : block
      )
    );
  }, []);

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
      />

      {!isProcessing && result && (
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
