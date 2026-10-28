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
  // Set when the model could not be reached; retryPendingPredictions asks again later.
  'ALTER TABLE transactions ADD COLUMN needs_prediction INTEGER NOT NULL DEFAULT 0',
  // Counts only answers that refused the input, not offline attempts.
  'ALTER TABLE transactions ADD COLUMN prediction_attempts INTEGER NOT NULL DEFAULT 0',
  // The redacted SMS body (no digits), kept only while merchant extraction is still to be retried.
  'ALTER TABLE transactions ADD COLUMN retry_text TEXT',
  // Rows saved before the flag existed cannot tell "model unreachable" from "model said unknown",
  // so an uncategorized debit with a merchant is asked once more.
  `UPDATE transactions SET needs_prediction = 1
    WHERE type = 'DEBIT' AND category = 'Uncategorized' AND source = 'fallback'
      AND merchant IS NOT NULL AND TRIM(merchant) <> ''`,
  'CREATE INDEX IF NOT EXISTS idx_transactions_needs_prediction ON transactions (needs_prediction) WHERE needs_prediction = 1',
  // A user's own category for a merchant. Personal: never shared, and only used while that user is signed in.
  // type keeps "money sent to Ali" and "money from Ali" apart.
  `CREATE TABLE IF NOT EXISTS category_rules (
    user_id TEXT NOT NULL,
    merchant_key TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, merchant_key, type)
  )`,
  // Every category the user changed, kept for a later, reviewed upload (synced = 0 until then).
  `CREATE TABLE IF NOT EXISTS category_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    transaction_id INTEGER NOT NULL,
    merchant TEXT,
    type TEXT NOT NULL,
    from_category TEXT NOT NULL,
    from_source TEXT NOT NULL,
    to_category TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
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
