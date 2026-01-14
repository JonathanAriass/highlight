import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import type { Scan } from '../types';

interface ScanHistoryListProps {
  scans: Scan[];
  onScanPress: (scan: Scan) => void;
  onScanDelete: (scanId: string) => void;
  isLoading?: boolean;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export function ScanHistoryList({
  scans,
  onScanPress,
  onScanDelete,
  isLoading = false,
}: ScanHistoryListProps) {
  const handleDelete = (scan: Scan) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onScanDelete(scan.id),
        },
      ]
    );
  };

  const renderItem = ({ item: scan }: { item: Scan }) => {
    const correctedCount = scan.blocks.filter((b) => b.correctedText).length;

    return (
      <TouchableOpacity
        style={styles.scanItem}
        onPress={() => onScanPress(scan)}
        onLongPress={() => handleDelete(scan)}
      >
        <Image source={{ uri: scan.imageUri }} style={styles.thumbnail} />
        <View style={styles.scanInfo}>
          <Text style={styles.scanText} numberOfLines={2}>
            {truncateText(scan.fullText || 'No text detected')}
          </Text>
          <View style={styles.scanMeta}>
            <Text style={styles.scanDate}>{formatDate(scan.createdAt)}</Text>
            <View style={styles.scanStats}>
              <Text style={styles.blockCount}>{scan.blocks.length} blocks</Text>
              {correctedCount > 0 && (
                <Text style={styles.correctedCount}>
                  {correctedCount} corrected
                </Text>
              )}
            </View>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📄</Text>
      <Text style={styles.emptyTitle}>No scans yet</Text>
      <Text style={styles.emptySubtitle}>
        Take a photo or select an image to get started
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading scans...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={scans}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={scans.length === 0 ? styles.emptyList : styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  scanItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  scanInfo: {
    flex: 1,
    marginLeft: 12,
  },
  scanText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  scanMeta: {
    marginTop: 6,
  },
  scanDate: {
    fontSize: 12,
    color: '#999',
  },
  scanStats: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 8,
  },
  blockCount: {
    fontSize: 12,
    color: '#007AFF',
  },
  correctedCount: {
    fontSize: 12,
    color: '#34C759',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
