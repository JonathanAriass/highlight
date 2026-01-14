import { type SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../../utils/id';
import type { Scan, TextBlock, ScanRow, TextBlockRow } from '../../types';

export class ScanRepository {
  constructor(private db: SQLiteDatabase) {}

  async createScan(
    imageUri: string,
    fullText: string,
    blocks: TextBlock[]
  ): Promise<Scan> {
    const id = generateId();
    const createdAt = Date.now();

    await this.db.runAsync(
      'INSERT INTO scans (id, imageUri, fullText, createdAt) VALUES (?, ?, ?, ?)',
      id,
      imageUri,
      fullText,
      createdAt
    );

    for (const block of blocks) {
      await this.db.runAsync(
        `INSERT INTO text_blocks (id, scanId, originalText, correctedText, boundingBox, confidence)
         VALUES (?, ?, ?, ?, ?, ?)`,
        block.id,
        id,
        block.text,
        block.correctedText ?? null,
        JSON.stringify(block.boundingBox),
        block.confidence
      );
    }

    return {
      id,
      imageUri,
      fullText,
      blocks,
      createdAt,
    };
  }

  async getScanById(id: string): Promise<Scan | null> {
    const scanRow = await this.db.getFirstAsync<ScanRow>(
      'SELECT * FROM scans WHERE id = ?',
      id
    );

    if (!scanRow) {
      return null;
    }

    const blockRows = await this.db.getAllAsync<TextBlockRow>(
      'SELECT * FROM text_blocks WHERE scanId = ?',
      id
    );

    const blocks: TextBlock[] = blockRows.map((row) => ({
      id: row.id,
      text: row.originalText,
      boundingBox: JSON.parse(row.boundingBox),
      confidence: row.confidence,
      correctedText: row.correctedText ?? undefined,
    }));

    return {
      id: scanRow.id,
      imageUri: scanRow.imageUri,
      fullText: scanRow.fullText,
      blocks,
      createdAt: scanRow.createdAt,
      updatedAt: scanRow.updatedAt ?? undefined,
    };
  }

  async getAllScans(): Promise<Scan[]> {
    const scanRows = await this.db.getAllAsync<ScanRow>(
      'SELECT * FROM scans ORDER BY createdAt DESC'
    );

    const scans: Scan[] = [];

    for (const scanRow of scanRows) {
      const blockRows = await this.db.getAllAsync<TextBlockRow>(
        'SELECT * FROM text_blocks WHERE scanId = ?',
        scanRow.id
      );

      const blocks: TextBlock[] = blockRows.map((row) => ({
        id: row.id,
        text: row.originalText,
        boundingBox: JSON.parse(row.boundingBox),
        confidence: row.confidence,
        correctedText: row.correctedText ?? undefined,
      }));

      scans.push({
        id: scanRow.id,
        imageUri: scanRow.imageUri,
        fullText: scanRow.fullText,
        blocks,
        createdAt: scanRow.createdAt,
        updatedAt: scanRow.updatedAt ?? undefined,
      });
    }

    return scans;
  }

  async updateTextBlock(
    blockId: string,
    correctedText: string
  ): Promise<void> {
    const updatedAt = Date.now();

    await this.db.runAsync(
      'UPDATE text_blocks SET correctedText = ? WHERE id = ?',
      correctedText,
      blockId
    );

    // Also update the parent scan's updatedAt
    await this.db.runAsync(
      `UPDATE scans SET updatedAt = ? WHERE id = (
        SELECT scanId FROM text_blocks WHERE id = ?
      )`,
      updatedAt,
      blockId
    );
  }

  async deleteScan(id: string): Promise<void> {
    // text_blocks will be deleted automatically due to ON DELETE CASCADE
    await this.db.runAsync('DELETE FROM scans WHERE id = ?', id);
  }

  async updateScanBlocks(scanId: string, blocks: TextBlock[]): Promise<void> {
    const updatedAt = Date.now();

    // Delete existing blocks
    await this.db.runAsync('DELETE FROM text_blocks WHERE scanId = ?', scanId);

    // Insert updated blocks
    for (const block of blocks) {
      await this.db.runAsync(
        `INSERT INTO text_blocks (id, scanId, originalText, correctedText, boundingBox, confidence)
         VALUES (?, ?, ?, ?, ?, ?)`,
        block.id,
        scanId,
        block.text,
        block.correctedText ?? null,
        JSON.stringify(block.boundingBox),
        block.confidence
      );
    }

    await this.db.runAsync(
      'UPDATE scans SET updatedAt = ? WHERE id = ?',
      updatedAt,
      scanId
    );
  }
}
