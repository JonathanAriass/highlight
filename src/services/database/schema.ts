import { type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY NOT NULL,
        imageUri TEXT NOT NULL,
        fullText TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS text_blocks (
        id TEXT PRIMARY KEY NOT NULL,
        scanId TEXT NOT NULL,
        originalText TEXT NOT NULL,
        correctedText TEXT,
        boundingBox TEXT NOT NULL,
        confidence REAL,
        FOREIGN KEY (scanId) REFERENCES scans(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_text_blocks_scanId ON text_blocks(scanId);
    `);
    currentDbVersion = 1;
  }

  // Future migrations can be added here
  // if (currentDbVersion === 1) {
  //   // Migration from version 1 to 2
  //   currentDbVersion = 2;
  // }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export const DATABASE_NAME = 'ocr_highlight.db';
