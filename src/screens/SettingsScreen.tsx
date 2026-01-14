import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLLM } from '../hooks';
import { AVAILABLE_MODELS } from '../services/llm';
import type { RootStackParamList, ModelInfo } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    modelInfo: currentModel,
    isDownloading,
    downloadProgress,
    isModelLoading,
    isReady,
    downloadModel,
    deleteModel,
    getDownloadedModels,
    initializeWithModel,
  } = useLLM({ autoInitialize: false });

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  // Load model statuses
  const refreshModels = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const downloaded = await getDownloadedModels();
      const downloadedIds = new Set(downloaded.map(m => m.id));

      const allModels: ModelInfo[] = AVAILABLE_MODELS.map(model => ({
        ...model,
        isDownloaded: downloadedIds.has(model.id),
        localPath: downloaded.find(d => d.id === model.id)?.localPath,
      }));

      setModels(allModels);

      // Set selected model to current or first downloaded
      if (currentModel?.id) {
        setSelectedModelId(currentModel.id);
      } else {
        const firstDownloaded = allModels.find(m => m.isDownloaded);
        if (firstDownloaded) {
          setSelectedModelId(firstDownloaded.id);
        }
      }
    } catch (error) {
      console.error('Failed to refresh models:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [getDownloadedModels, currentModel]);

  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  const handleDownload = useCallback(async (modelId: string) => {
    setDownloadingModelId(modelId);
    try {
      const success = await downloadModel(modelId);
      if (success) {
        await refreshModels();
        Alert.alert('Success', 'Model downloaded successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download model. Please try again.');
    } finally {
      setDownloadingModelId(null);
    }
  }, [downloadModel, refreshModels]);

  const handleDelete = useCallback(async (modelId: string) => {
    Alert.alert(
      'Delete Model',
      'Are you sure you want to delete this model? You will need to download it again to use it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteModel(modelId);
              await refreshModels();
              if (selectedModelId === modelId) {
                setSelectedModelId(null);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete model.');
            }
          },
        },
      ]
    );
  }, [deleteModel, refreshModels, selectedModelId]);

  const handleSelect = useCallback(async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model?.isDownloaded) {
      Alert.alert('Not Downloaded', 'Please download this model first.');
      return;
    }

    setSelectedModelId(modelId);
    try {
      await initializeWithModel(modelId);
      Alert.alert('Model Selected', `${model.name} is now active.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to load model.');
    }
  }, [models, initializeWithModel]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI Models</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionDescription}>
          Download and manage AI models for text summarization. Larger models produce better summaries but take longer to run.
        </Text>

        {isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading models...</Text>
          </View>
        ) : (
          <View style={styles.modelList}>
            {models.map((model) => {
              const isCurrentlyDownloading = downloadingModelId === model.id;
              const isSelected = selectedModelId === model.id && model.isDownloaded;

              return (
                <View
                  key={model.id}
                  style={[
                    styles.modelCard,
                    isSelected && styles.modelCardSelected,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.modelInfo}
                    onPress={() => model.isDownloaded && handleSelect(model.id)}
                    disabled={!model.isDownloaded}
                  >
                    <View style={styles.modelHeader}>
                      <Text style={styles.modelName}>{model.name}</Text>
                      {isSelected && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.modelSize}>{formatSize(model.size)}</Text>
                    {model.isDownloaded && (
                      <Text style={styles.downloadedText}>✓ Downloaded</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.modelActions}>
                    {isCurrentlyDownloading ? (
                      <View style={styles.downloadingContainer}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={styles.downloadingText}>
                          {downloadProgress.toFixed(0)}%
                        </Text>
                      </View>
                    ) : model.isDownloaded ? (
                      <View style={styles.actionButtons}>
                        {!isSelected && (
                          <TouchableOpacity
                            style={styles.selectButton}
                            onPress={() => handleSelect(model.id)}
                          >
                            <Text style={styles.selectButtonText}>Use</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDelete(model.id)}
                        >
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={() => handleDownload(model.id)}
                      >
                        <Text style={styles.downloadButtonText}>Download</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Models</Text>
          <Text style={styles.infoText}>
            • Qwen2 0.5B: Smallest and fastest, good for simple texts{'\n'}
            • SmolLM2 360M: Great balance of speed and quality{'\n'}
            • Qwen2 1.5B: Best quality, slower on older devices
          </Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  modelList: {
    gap: 12,
  },
  modelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modelCardSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  modelInfo: {
    marginBottom: 12,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  activeBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  modelSize: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  downloadedText: {
    fontSize: 13,
    color: '#34C759',
    marginTop: 4,
  },
  modelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadingText: {
    fontSize: 14,
    color: '#007AFF',
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});
