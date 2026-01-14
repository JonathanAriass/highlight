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
