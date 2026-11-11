import { create } from 'axios';

import { api } from '@/api/client';
import { API_URL } from '@/config/env';
import { AUTH_BYPASS } from '@/config/flags';
import { devLog } from '@/utils/devLog';

import { parseReceipt, type ScannedReceipt } from './parseReceipt';

// Reading an image can take the model most of its 30 seconds.
const TIMEOUT_MS = 35000;

// Signed in, the app calls the model through the gateway; auth bypass has no token, so it calls the model server directly.
const http = AUTH_BYPASS ? create({ baseURL: API_URL }) : api;
const PATH = AUTH_BYPASS ? '/extract-receipt' : '/api/ai-service/extract-receipt';

export type ReceiptFile = { base64: string; mimeType: string };

// unreadable: the server answered but found no total, or refused the file. unavailable: no reply or the model is busy.
export type ReceiptResult = ScannedReceipt | 'unreadable' | 'unavailable';

// Sends the photo or PDF to the model server and reads back the fields. Never throws; the file is not kept.
export async function readReceipt(file: ReceiptFile): Promise<ReceiptResult> {
  try {
    const { data } = await http.post<unknown>(
      PATH,
      { image_base64: file.base64, mime_type: file.mimeType },
      { timeout: TIMEOUT_MS },
    );
    return parseReceipt(data) ?? 'unreadable';
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    devLog(`[receipt] failed: ${status ? `HTTP ${status}` : String(error)}`);
    // A refused file (too large, wrong type) will not work on a retry; a 401, 429 or 5xx might.
    return status !== undefined && status >= 400 && status < 500 && status !== 401 && status !== 429
      ? 'unreadable'
      : 'unavailable';
  }
}
