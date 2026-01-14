// Bounding box for text detection regions
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Individual text block detected by OCR
export interface TextBlock {
  id: string;
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
  correctedText?: string;
}

// Complete OCR result from processing an image
export interface OCRResult {
  text: string;
  blocks: TextBlock[];
  confidence: number;
}

// Scan record for persistence
export interface Scan {
  id: string;
  imageUri: string;
  fullText: string;
  blocks: TextBlock[];
  createdAt: number;
  updatedAt?: number;
  summary?: string;
  summaryModelName?: string;
}

// Image size for scaling calculations
export interface Size {
  width: number;
  height: number;
}

// Navigation params for the app
export type RootStackParamList = {
  Home: undefined;
  Scan: { imageUri: string };
  ScanDetail: { scanId: string };
  Settings: undefined;
};

// OCR Service interface - abstraction for different providers
export interface OCRService {
  recognize(imageUri: string): Promise<OCRResult>;
  getName(): string;
}

// Database row types
export interface ScanRow {
  id: string;
  imageUri: string;
  fullText: string;
  createdAt: number;
  updatedAt: number | null;
}

export interface TextBlockRow {
  id: string;
  scanId: string;
  originalText: string;
  correctedText: string | null;
  boundingBox: string; // JSON stringified
  confidence: number;
}

// LLM Summary result
export interface SummaryResult {
  id: string;
  text: string;
  generatedAt: number;
  modelName: string;
  promptTokens?: number;
  completionTokens?: number;
}

// LLM Model information
export interface ModelInfo {
  id: string;
  name: string;
  filename: string;
  size: number;
  downloadUrl: string;
  isDownloaded: boolean;
  downloadProgress?: number;
  localPath?: string;
}

// Model download progress
export interface ModelDownloadProgress {
  modelId: string;
  bytesDownloaded: number;
  totalBytes: number;
  progress: number;
}

// Database row for summaries
export interface SummaryRow {
  id: string;
  scanId: string;
  summaryText: string;
  modelName: string;
  createdAt: number;
}
