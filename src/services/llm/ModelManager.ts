import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import type { ModelInfo, ModelDownloadProgress } from '../../types';

// Pre-configured models (500MB-2GB range)
// Using smaller quantized versions for mobile
export const AVAILABLE_MODELS: Omit<ModelInfo, 'isDownloaded' | 'localPath' | 'downloadProgress'>[] = [
  {
    id: 'qwen2-0.5b',
    name: 'Qwen2 0.5B (Q4)',
    filename: 'qwen2-0_5b-instruct-q4_k_m.gguf',
    size: 400_000_000, // ~400MB
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2-0.5B-Instruct-GGUF/resolve/main/qwen2-0_5b-instruct-q4_k_m.gguf',
  },
  {
    id: 'qwen2-1.5b',
    name: 'Qwen2 1.5B (Q4)',
    filename: 'qwen2-1_5b-instruct-q4_k_m.gguf',
    size: 900_000_000, // ~900MB
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2-1.5B-Instruct-GGUF/resolve/main/qwen2-1_5b-instruct-q4_k_m.gguf',
  },
  {
    id: 'smollm2-360m',
    name: 'SmolLM2 360M (Q8)',
    filename: 'smollm2-360m-instruct-q8_0.gguf',
    size: 380_000_000, // ~380MB
    downloadUrl: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf',
  },
];

export const DEFAULT_MODEL_ID = 'smollm2-360m';

export class ModelManager {
  private modelsDir: string;
  private downloadTasks: Map<string, ReturnType<typeof FileSystem.createDownloadResumable>> = new Map();

  constructor() {
    this.modelsDir = `${Paths.document.uri}models/`;
  }

  async ensureModelsDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.modelsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.modelsDir, { intermediates: true });
    }
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) return null;

    const localPath = `${this.modelsDir}${model.filename}`;
    const fileInfo = await FileSystem.getInfoAsync(localPath);

    return {
      ...model,
      isDownloaded: fileInfo.exists,
      localPath: fileInfo.exists ? localPath : undefined,
    };
  }

  async getDownloadedModels(): Promise<ModelInfo[]> {
    await this.ensureModelsDirectory();
    const models: ModelInfo[] = [];

    for (const model of AVAILABLE_MODELS) {
      const info = await this.getModelInfo(model.id);
      if (info?.isDownloaded) {
        models.push(info);
      }
    }

    return models;
  }

  async downloadModel(
    modelId: string,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<string> {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    await this.ensureModelsDirectory();
    const localPath = `${this.modelsDir}${model.filename}`;

    // Check if already downloaded
    const existing = await FileSystem.getInfoAsync(localPath);
    if (existing.exists) return localPath;

    console.log(`Starting download of ${model.name} from ${model.downloadUrl}`);

    // Create download task
    const downloadResumable = FileSystem.createDownloadResumable(
      model.downloadUrl,
      localPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesExpectedToWrite > 0
          ? (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
          : 0;
        onProgress?.({
          modelId,
          bytesDownloaded: downloadProgress.totalBytesWritten,
          totalBytes: downloadProgress.totalBytesExpectedToWrite,
          progress,
        });
      }
    );

    this.downloadTasks.set(modelId, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('Download failed - no URI returned');
      console.log(`Model downloaded to ${result.uri}`);
      return result.uri;
    } catch (error) {
      // Clean up partial download
      const partialFile = await FileSystem.getInfoAsync(localPath);
      if (partialFile.exists) {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      }
      throw error;
    } finally {
      this.downloadTasks.delete(modelId);
    }
  }

  cancelDownload(modelId: string): void {
    const task = this.downloadTasks.get(modelId);
    if (task) {
      task.pauseAsync();
      this.downloadTasks.delete(modelId);
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) return;

    const localPath = `${this.modelsDir}${model.filename}`;
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(localPath);
    }
  }

  getModelPath(modelId: string): string {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);
    return `${this.modelsDir}${model.filename}`;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
