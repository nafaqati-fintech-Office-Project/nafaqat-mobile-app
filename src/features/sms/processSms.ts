import { parseSms } from './parser/parseSms';
import type { ParsedTxn } from './parser/types';
import type { SmsMessage } from './smsReader';
import { categorize, type Categorized } from '@/features/categorizer/categorize';

export type ProcessedSms = {
  txn: ParsedTxn;
  category: string;
  source: Categorized['source'];
  confidence?: number;
};

export async function processSms(sms: SmsMessage): Promise<ProcessedSms | null> {
  const txn = parseSms(sms);
  if (!txn) return null;
  const { category, source, confidence } = await categorize(txn);
  return { txn, category, source, confidence };
}
