import type { SQLiteDatabase } from 'expo-sqlite';

// The local transaction store holds SMS data, which only exists on the phone. On web this file replaces
// db.ts, so the bundler never loads expo-sqlite's web worker and its .wasm file.
export function getDb(): Promise<SQLiteDatabase> {
  return Promise.reject(new Error('The local transaction database is not available on web'));
}
