# OCR Highlight App

An Expo React Native app that performs OCR (Optical Character Recognition) on images with interactive highlighting capabilities. Tap on detected text to correct misread values.

## Features

- **Camera & Gallery Support** - Capture images or select from photo library
- **Cloud-based OCR** - Uses OCR.space API with automatic image compression
- **Interactive Highlights** - Detected text displayed with tappable bounding boxes
- **Text Correction** - Tap any word to edit/override OCR results
- **Color-coded Status**:
  - Blue: Detected text
  - Green: Corrected text
- **Scan History** - All scans saved locally with SQLite
- **Swappable OCR Provider** - Abstract interface to easily switch OCR backends

## Screenshots

| Home Screen | OCR Result | Edit Modal |
|-------------|------------|------------|
| Scan history & capture buttons | Image with highlighted text | Correct misread values |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)

### Installation

```bash
# Clone the repository
cd ocr-highlight-app

# Install dependencies
npm install

# Generate native projects
npx expo prebuild

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

### API Key Setup

The app includes a demo OCR.space API key with limited requests. For production use:

1. Get a free API key at https://ocr.space/ocrapi/freekey
2. Update the key in `src/services/ocr/CloudVisionProvider.ts`:

```typescript
constructor(apiKey: string = 'YOUR_API_KEY_HERE') {
```

## Project Structure

```
src/
├── components/
│   ├── ImageCapture.tsx        # Camera/gallery picker UI
│   ├── OCRResultView.tsx       # Image display with overlays
│   ├── TextBlockOverlay.tsx    # Individual tappable highlight
│   ├── EditModal.tsx           # Text correction modal
│   └── ScanHistoryList.tsx     # Previous scans list
├── services/
│   ├── ocr/
│   │   ├── OCRService.ts       # Abstract interface
│   │   ├── CloudVisionProvider.ts  # OCR.space implementation
│   │   └── TesseractProvider.ts    # Tesseract.js (web only)
│   └── database/
│       ├── schema.ts           # SQLite table definitions
│       └── scanRepository.ts   # CRUD operations
├── hooks/
│   ├── useOCR.ts               # OCR processing hook
│   ├── useScans.ts             # Database operations hook
│   └── useImagePicker.ts       # Camera/gallery hook
├── screens/
│   ├── HomeScreen.tsx          # Main screen
│   ├── ScanScreen.tsx          # New scan processing
│   └── ScanDetailScreen.tsx    # View/edit saved scan
├── types/
│   └── index.ts                # TypeScript interfaces
└── utils/
    └── id.ts                   # ID generation utility
```

## Swapping OCR Providers

The app uses an abstract `IOCRService` interface, making it easy to swap OCR backends:

```typescript
// src/services/ocr/OCRService.ts
interface IOCRService {
  recognize(imageUri: string): Promise<OCRResult>;
  getName(): string;
  isReady(): boolean;
  initialize(): Promise<void>;
  terminate(): Promise<void>;
}
```

To use a different provider, edit `src/services/ocr/index.ts`:

```typescript
import { YourCustomProvider } from './YourCustomProvider';

export function getOCRProvider(): IOCRService {
  if (!currentProvider) {
    currentProvider = new YourCustomProvider();
  }
  return currentProvider;
}
```

### Available Providers

| Provider | Platform | Notes |
|----------|----------|-------|
| `CloudVisionProvider` | iOS, Android, Web | Uses OCR.space API, requires internet |
| `TesseractProvider` | Web only | Uses Tesseract.js, works offline |

## Tech Stack

- **Expo SDK 54** - React Native framework
- **TypeScript** - Type safety
- **expo-sqlite** - Local database
- **expo-image-picker** - Camera/gallery access
- **expo-image-manipulator** - Image compression
- **expo-file-system** - File operations
- **React Navigation** - Screen navigation

## Database Schema

```sql
-- Scans table
CREATE TABLE scans (
  id TEXT PRIMARY KEY,
  imageUri TEXT NOT NULL,
  fullText TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER
);

-- Text blocks table
CREATE TABLE text_blocks (
  id TEXT PRIMARY KEY,
  scanId TEXT NOT NULL,
  originalText TEXT NOT NULL,
  correctedText TEXT,
  boundingBox TEXT NOT NULL,
  confidence REAL,
  FOREIGN KEY (scanId) REFERENCES scans(id) ON DELETE CASCADE
);
```

## License

MIT
