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

// Applied in order on top of SCHEMA; PRAGMA user_version records how many have run, so existing
// installs get the new columns and fresh installs run all of them once.
const MIGRATIONS = [
  'ALTER TABLE transactions ADD COLUMN balance TEXT',
  'ALTER TABLE transactions ADD COLUMN txn_date INTEGER',
  // Messages that look like a money movement but could not be parsed. They stay on the device.
  `CREATE TABLE IF NOT EXISTS unparsed_sms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sms_id TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    body TEXT NOT NULL,
    date INTEGER NOT NULL,
    reason TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0
  )`,
];

let database: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  database ??= openDatabaseAsync('nafaqati.db').then(async (db) => {
    await db.execAsync(SCHEMA);
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    for (let i = row?.user_version ?? 0; i < MIGRATIONS.length; i++) {
      await db.execAsync(MIGRATIONS[i]);
      await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    }
    return db;
  });
  return database;
}
