import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  Text,
  ActivityIndicator,
} from 'react-native';
import { TextBlockOverlay } from './TextBlockOverlay';
import { EditModal } from './EditModal';
import type { TextBlock, Size } from '../types';

interface OCRResultViewProps {
  imageUri: string;
  blocks: TextBlock[];
  isProcessing?: boolean;
  onBlockUpdate: (blockId: string, correctedText: string) => void;
}

const screenWidth = Dimensions.get('window').width;

export function OCRResultView({
  imageUri,
  blocks,
  isProcessing = false,
  onBlockUpdate,
}: OCRResultViewProps) {
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [displaySize, setDisplaySize] = useState<Size | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TextBlock | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleImageLoad = useCallback((event: { nativeEvent: { source: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.source;
    setImageSize({ width, height });

    // Calculate display size maintaining aspect ratio
    // Account for: contentContainer padding (16*2) + imageContainer padding (8*2)
    const aspectRatio = width / height;
    const displayWidth = screenWidth - 32 - 16;
    const displayHeight = displayWidth / aspectRatio;
    setDisplaySize({ width: displayWidth, height: displayHeight });
  }, []);

  const handleBlockPress = useCallback((block: TextBlock) => {
    setSelectedBlock(block);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(
    (blockId: string, correctedText: string) => {
      onBlockUpdate(blockId, correctedText);
      setModalVisible(false);
      setSelectedBlock(null);
    },
    [onBlockUpdate]
  );

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedBlock(null);
  }, []);

  // Count corrected blocks
  const correctedCount = blocks.filter((b) => b.correctedText).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={[
            styles.image,
            displaySize && { width: displaySize.width, height: displaySize.height },
          ]}
          onLoad={handleImageLoad}
          resizeMode="contain"
        />

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Processing image...</Text>
          </View>
        )}

        {!isProcessing && imageSize && displaySize && (
          <View
            style={[
              styles.overlayContainer,
              { width: displaySize.width, height: displaySize.height },
            ]}
          >
            {blocks.map((block) => (
              <TextBlockOverlay
                key={block.id}
                block={block}
                imageSize={imageSize}
                displaySize={displaySize}
                onPress={handleBlockPress}
                isSelected={selectedBlock?.id === block.id}
              />
            ))}
          </View>
        )}
      </View>

      {!isProcessing && blocks.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{blocks.length}</Text>
            <Text style={styles.statLabel}>Text blocks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, correctedCount > 0 && styles.correctedValue]}>
              {correctedCount}
            </Text>
            <Text style={styles.statLabel}>Corrected</Text>
          </View>
        </View>
      )}

      {!isProcessing && blocks.length === 0 && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No text detected in image</Text>
        </View>
      )}

      <Text style={styles.helpText}>
        Tap on highlighted areas to edit detected text
      </Text>

      <EditModal
        visible={modalVisible}
        block={selectedBlock}
        onSave={handleSave}
        onClose={handleCloseModal}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  contentContainer: {
    padding: 16,
  },
  imageContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    borderRadius: 8,
  },
  overlayContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 8,
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  correctedValue: {
    color: '#34C759',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
  noResultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
  },
  helpText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});
