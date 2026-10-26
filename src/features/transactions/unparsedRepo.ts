import { getDb } from './db';
import { detectMiss, type MissReason } from '@/features/sms/parser/detectMiss';
import type { SmsMessage } from '@/features/sms/smsReader';

export type UnparsedSms = {
  id: number;
  smsId: string;
  address: string;
  body: string;
  date: number;
  reason: MissReason;
};

type Row = Omit<UnparsedSms, 'smsId'> & { sms_id: string };

// Keeps a message the parser could not read so it is not lost. Returns false when the message is not a
// suspected transaction or was already stored.
export async function saveIfMissed(sms: SmsMessage): Promise<boolean> {
  const reason = detectMiss(sms);
  if (!reason) return false;
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT OR IGNORE INTO unparsed_sms (sms_id, address, body, date, reason) VALUES (?, ?, ?, ?, ?)',
    [sms.id, sms.address, sms.body, sms.date, reason],
  );
  return result.changes > 0;
}

export async function listUnparsed(limit = 100): Promise<UnparsedSms[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT id, sms_id, address, body, date, reason FROM unparsed_sms WHERE resolved = 0 ORDER BY date DESC LIMIT ?',
    [limit],
  );
  return rows.map(({ sms_id, ...row }) => ({ ...row, smsId: sms_id }));
}
