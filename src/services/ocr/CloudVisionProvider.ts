import { File } from 'expo-file-system/next';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';
import { generateId } from '../../utils/id';
import type { IOCRService } from './OCRService';
import type { OCRResult, TextBlock, BoundingBox } from '../../types';

/**
 * Cloud-based OCR provider using OCR.space API.
 * Free tier available, no credit card required.
 * For production, consider Google Cloud Vision API.
 *
 * Get your free API key at: https://ocr.space/ocrapi/freekey
 */
export class CloudVisionProvider implements IOCRService {
  private ready = true;
  private apiKey: string;
  private apiUrl = 'https://api.ocr.space/parse/image';

  constructor(apiKey: string = 'K85403655988957') {
    // Default is a demo key with limited requests
    // Get your own free key at: https://ocr.space/ocrapi/freekey
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'OCR.space Cloud API';
  }

  isReady(): boolean {
    return this.ready;
  }

  async initialize(): Promise<void> {
    this.ready = true;
  }

  private getImageSize(uri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        reject
      );
    });
  }

  async recognize(imageUri: string, cropRegion?: BoundingBox): Promise<OCRResult> {
    try {
      console.log('OCR: Starting image processing...');
      console.log('OCR: Original image URI:', imageUri);
      console.log('OCR: Crop region:', cropRegion);

      // Get original image dimensions
      const originalSize = await this.getImageSize(imageUri);
      console.log('OCR: Original dimensions:', originalSize.width, 'x', originalSize.height);

      // Build manipulation actions
      const actions: Parameters<typeof manipulateAsync>[1] = [];

      // Add crop action if region specified
      if (cropRegion) {
        actions.push({
          crop: {
            originX: Math.max(0, Math.round(cropRegion.x)),
            originY: Math.max(0, Math.round(cropRegion.y)),
            width: Math.min(Math.round(cropRegion.width), originalSize.width - Math.round(cropRegion.x)),
            height: Math.min(Math.round(cropRegion.height), originalSize.height - Math.round(cropRegion.y)),
          },
        });
      }

      // Add resize for compression
      actions.push({ resize: { width: 1000 } });

      // Compress image to stay under 1MB limit
      const compressed = await manipulateAsync(
        imageUri,
        actions,
        { compress: 0.5, format: SaveFormat.JPEG }
      );
      console.log('OCR: Compressed image URI:', compressed.uri);
      console.log('OCR: Compressed dimensions:', compressed.width, 'x', compressed.height);

      // Calculate the size after cropping (before compression)
      const croppedSize = cropRegion
        ? { width: cropRegion.width, height: cropRegion.height }
        : originalSize;

      // Calculate scale factors to convert coordinates back to cropped size
      const scaleX = croppedSize.width / compressed.width;
      const scaleY = croppedSize.height / compressed.height;
      console.log('OCR: Scale factors:', scaleX, 'x', scaleY);

      // Read compressed image as base64
      const file = new File(compressed.uri);
      const base64 = await file.base64();

      // Calculate approximate file size (base64 is ~33% larger than binary)
      const approxSizeKB = Math.round((base64.length * 3) / 4 / 1024);
      console.log('OCR: Base64 length:', base64.length);
      console.log('OCR: Approximate file size:', approxSizeKB, 'KB');

      const fileType = 'image/jpeg';

      // Create form data
      const formData = new FormData();
      formData.append('base64Image', `data:${fileType};base64,${base64}`);
      formData.append('apikey', this.apiKey);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'true');
      formData.append('OCREngine', '2'); // More accurate engine

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
      }

      return this.transformResult(result, scaleX, scaleY, cropRegion);
    } catch (error) {
      console.error('Cloud OCR recognition failed:', error);
      throw error;
    }
  }

  private transformResult(
    result: {
      ParsedResults?: Array<{
        ParsedText: string;
        TextOverlay?: {
          Lines?: Array<{
            Words: Array<{
              WordText: string;
              Left: number;
              Top: number;
              Width: number;
              Height: number;
            }>;
            MaxHeight: number;
            MinTop: number;
          }>;
        };
      }>;
    },
    scaleX: number,
    scaleY: number,
    cropRegion?: BoundingBox
  ): OCRResult {
    const blocks: TextBlock[] = [];
    let fullText = '';

    // Offset to add for cropped regions (to map back to original image coordinates)
    const offsetX = cropRegion?.x ?? 0;
    const offsetY = cropRegion?.y ?? 0;

    if (result.ParsedResults && result.ParsedResults.length > 0) {
      const parsed = result.ParsedResults[0];
      fullText = parsed.ParsedText || '';

      // Extract words with bounding boxes from overlay
      if (parsed.TextOverlay?.Lines) {
        for (const line of parsed.TextOverlay.Lines) {
          for (const word of line.Words) {
            if (word.WordText.trim()) {
              // Scale bounding box from compressed to cropped size, then offset to original coordinates
              const boundingBox: BoundingBox = {
                x: word.Left * scaleX + offsetX,
                y: word.Top * scaleY + offsetY,
                width: word.Width * scaleX,
                height: word.Height * scaleY,
              };

              blocks.push({
                id: generateId(),
                text: word.WordText,
                boundingBox,
                confidence: 0.9, // OCR.space doesn't provide per-word confidence
              });
            }
          }
        }
      }
    }

    return {
      text: fullText,
      blocks,
      confidence: blocks.length > 0 ? 0.9 : 0,
    };
  }

  async terminate(): Promise<void> {
    // No cleanup needed for cloud API
  }
}
