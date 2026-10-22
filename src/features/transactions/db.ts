import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dedupe_key TEXT NOT NULL UNIQUE,
  sms_id TEXT NOT NULL,
  bank TEXT NOT NULL,
  type TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  merchant TEXT,
  card_last4 TEXT,
  date INTEGER NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date DESC);
`;

let database: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  database ??= openDatabaseAsync('nafaqati.db').then(async (db) => {
    await db.execAsync(SCHEMA);
    return db;
  });
  return database;
}
