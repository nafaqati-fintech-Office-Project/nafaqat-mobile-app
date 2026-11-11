import type { CreateTransactionBody } from './syncMapping';
import { api } from '@/api/client';

// Calls to the transaction service through the gateway (the api client adds the token and refreshes it).
// They throw axios errors; the sync decides what each status means.

function serverId(body: unknown): string {
  const id = (body as { id?: unknown } | null)?.id;
  if (typeof id !== 'string' || !id) throw new Error('Response has no transaction id');
  return id;
}

export async function createTransaction(body: CreateTransactionBody): Promise<string> {
  const response = await api.post<unknown>('/api/transactions', body);
  return serverId(response.data);
}

// After a 409 (created before, but the reply was lost): the id of the copy already on the server.
export async function findByExternalId(externalTransactionId: string): Promise<string> {
  const response = await api.get<unknown>('/api/transactions/by-external-id', { params: { externalTransactionId } });
  return serverId(response.data);
}

export async function updateCategory(id: string, category: string): Promise<void> {
  await api.patch(`/api/transactions/${encodeURIComponent(id)}`, { category });
}

// Whether the signed-in account has any transaction on the server at all (the list endpoint, which every server has).
export async function accountHasTransactions(): Promise<boolean> {
  const response = await api.get<unknown>('/api/transactions', { params: { size: 1, status: 'COMPLETED' } });
  const content = (response.data as { content?: unknown } | null)?.content;
  return Array.isArray(content) && content.length > 0;
}
