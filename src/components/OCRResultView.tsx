import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { TextBlockOverlay } from './TextBlockOverlay';
import { EditModal } from './EditModal';
import { SelectionOverlay } from './SelectionOverlay';
import type { TextBlock, Size, BoundingBox } from '../types';

interface OCRResultViewProps {
  imageUri: string;
  blocks: TextBlock[];
  isProcessing?: boolean;
  onBlockUpdate: (blockId: string, correctedText: string) => void;
  onRegionScan?: (region: BoundingBox) => void;
  onSelectionModeChange?: (isSelectionMode: boolean) => void;
  // Summary props
  summary?: string;
  isSummarizing?: boolean;
  streamingText?: string;
  onResummarize?: () => void;
  onDownloadModel?: () => void;
  isModelDownloaded?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function OCRResultView({
  imageUri,
  blocks,
  isProcessing = false,
  onBlockUpdate,
  onRegionScan,
  onSelectionModeChange,
  summary,
  isSummarizing = false,
  streamingText = '',
  onResummarize,
  onDownloadModel,
  isModelDownloaded = false,
}: OCRResultViewProps) {
  // Debug log for summary props
  console.log('[OCRResultView] Summary props:', {
    hasSummary: !!summary,
    isSummarizing,
    hasStreamingText: !!streamingText,
    isModelDownloaded,
    hasOnDownloadModel: !!onDownloadModel,
    hasOnResummarize: !!onResummarize,
  });

  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [displaySize, setDisplaySize] = useState<Size | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TextBlock | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<BoundingBox | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const horizontalScrollRef = useRef<ScrollView>(null);

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
    if (selectionMode) return; // Ignore taps when in selection mode
    setSelectedBlock(block);
    setModalVisible(true);
  }, [selectionMode]);

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

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      const newMode = !prev;
      onSelectionModeChange?.(newMode);
      return newMode;
    });
    setSelectedRegion(null);
  }, [onSelectionModeChange]);

  const handleSelectionComplete = useCallback((region: BoundingBox) => {
    setSelectedRegion(region);
  }, []);

  const handleScanSelection = useCallback(() => {
    if (selectedRegion && onRegionScan) {
      onRegionScan(selectedRegion);
      setSelectionMode(false);
      setSelectedRegion(null);
      onSelectionModeChange?.(false);
    }
  }, [selectedRegion, onRegionScan, onSelectionModeChange]);

  // Count corrected blocks
  const correctedCount = blocks.filter((b) => b.correctedText).length;

  const handleHorizontalScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / screenWidth);
      setActiveTab(page);
    },
    []
  );

  const switchToTab = useCallback((tabIndex: number) => {
    horizontalScrollRef.current?.scrollTo({ x: tabIndex * screenWidth, animated: true });
    setActiveTab(tabIndex);
  }, []);

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      {!isProcessing && !selectionMode && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 0 && styles.activeTab]}
            onPress={() => switchToTab(0)}
          >
            <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>
              Image
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 1 && styles.activeTab]}
            onPress={() => switchToTab(1)}
          >
            <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>
              Text ({blocks.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mode toggle button - only show on image tab */}
      {!isProcessing && onRegionScan && activeTab === 0 && (
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[
              styles.modeToggleButton,
              selectionMode && styles.modeToggleButtonActive,
            ]}
            onPress={handleToggleSelectionMode}
          >
            <Text style={[
              styles.modeToggleText,
              selectionMode && styles.modeToggleTextActive,
            ]}>
              {selectionMode ? '✓ Selection Mode' : '⬚ Select Region'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Horizontal paging ScrollView */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleHorizontalScroll}
        scrollEnabled={!selectionMode}
        style={styles.horizontalScroll}
      >
        {/* Page 1: Image View */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            scrollEnabled={!selectionMode}
          >
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
                      isDimmed={selectionMode}
                    />
                  ))}

                  {/* Selection overlay for drawing region */}
                  {selectionMode && (
                    <SelectionOverlay
                      imageSize={imageSize}
                      displaySize={displaySize}
                      onSelectionComplete={handleSelectionComplete}
                      isActive={selectionMode}
                    />
                  )}
                </View>
              )}
            </View>

            {!isProcessing && blocks.length > 0 && !selectionMode && (
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

            {!isProcessing && blocks.length === 0 && !selectionMode && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No text detected in image</Text>
              </View>
            )}

            {!selectionMode && (
              <Text style={styles.helpText}>
                Tap on highlighted areas to edit • Swipe left for text
              </Text>
            )}
          </ScrollView>
        </View>

        {/* Page 2: Text View */}
        <View style={styles.page}>
          <ScrollView
            style={styles.textViewScroll}
            contentContainerStyle={styles.textViewContent}
          >
            {/* Summary Section - Always visible on Text tab */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>AI Summary</Text>
                {!isSummarizing && summary && onResummarize && (
                  <TouchableOpacity onPress={onResummarize}>
                    <Text style={styles.regenerateButton}>Regenerate</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!isModelDownloaded ? (
                <View style={styles.downloadPrompt}>
                  <Text style={styles.downloadPromptText}>
                    Download an AI model to generate summaries
                  </Text>
                  {onDownloadModel && (
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={onDownloadModel}
                    >
                      <Text style={styles.downloadButtonText}>Download Model</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : isSummarizing ? (
                <View style={styles.summaryLoading}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.summaryStreamText}>
                    {streamingText || 'Generating summary...'}
                  </Text>
                </View>
              ) : summary ? (
                <Text style={styles.summaryText}>{summary}</Text>
              ) : (
                <View style={styles.downloadPrompt}>
                  <Text style={styles.downloadPromptText}>
                    No summary yet
                  </Text>
                  {onResummarize && (
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={onResummarize}
                    >
                      <Text style={styles.downloadButtonText}>Generate Summary</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Text Blocks */}
            {blocks.length > 0 && (
              <Text style={styles.textBlocksHeader}>
                Extracted Text ({blocks.length} blocks)
              </Text>
            )}
            {blocks.length > 0 ? (
              blocks.map((block, index) => (
                <TouchableOpacity
                  key={block.id}
                  style={styles.textBlock}
                  onPress={() => {
                    setSelectedBlock(block);
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.textBlockNumber}>#{index + 1}</Text>
                  <Text style={styles.textBlockContent}>
                    {block.correctedText || block.text}
                  </Text>
                  {block.correctedText && (
                    <Text style={styles.correctedBadge}>Edited</Text>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noTextContainer}>
                <Text style={styles.noTextMessage}>No text detected</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Fixed footer for selection mode */}
      {selectionMode && (
        <View style={styles.selectionFooter}>
          <Text style={styles.selectionHelpText}>
            Draw a rectangle on the image to select a region
          </Text>
          {selectedRegion && (
            <TouchableOpacity
              style={styles.scanSelectionButton}
              onPress={handleScanSelection}
            >
              <Text style={styles.scanSelectionButtonText}>Scan Selection</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <EditModal
        visible={modalVisible}
        block={selectedBlock}
        onSave={handleSave}
        onClose={handleCloseModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
  },
  modeToggleContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  horizontalScroll: {
    flex: 1,
  },
  page: {
    width: screenWidth,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  selectionFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modeToggleButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF6B00',
    alignItems: 'center',
  },
  modeToggleButtonActive: {
    backgroundColor: '#FF6B00',
  },
  modeToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B00',
  },
  modeToggleTextActive: {
    color: '#fff',
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
  scanSelectionButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanSelectionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
  selectionHelpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  textViewScroll: {
    flex: 1,
  },
  textViewContent: {
    padding: 16,
  },
  textBlock: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textBlockNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  textBlockContent: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
  },
  correctedBadge: {
    marginTop: 8,
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  noTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noTextMessage: {
    fontSize: 16,
    color: '#666',
  },
  // Summary styles
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  regenerateButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  downloadPrompt: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  downloadPromptText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryLoading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  summaryStreamText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  textBlocksHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginTop: 4,
  },
});
