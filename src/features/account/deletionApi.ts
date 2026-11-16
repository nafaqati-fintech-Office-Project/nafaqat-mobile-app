import { api } from '@/api/client';
import { arr, obj, str } from '@/api/parse';

// Account deletion (docs/account-deletion.md in the backend). A request starts a 30-day grace period: nothing is
// erased until purgeAfter, and the user can cancel ("restore") until then by signing in again.
const REQUESTS = '/api/users/me/deletion-requests';

export type DeletionStatus = 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export type DeletionRequest = {
  id: string;
  status: DeletionStatus;
  requestedAt: string;
  // ISO instant: when the account is erased.
  purgeAfter: string;
};

const STATUSES: readonly DeletionStatus[] = ['REQUESTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

export function parseDeletionRequest(raw: unknown): DeletionRequest {
  const body = obj(raw);
  const status = str(body.status) as DeletionStatus;
  if (!STATUSES.includes(status)) throw new Error(`Unknown deletion status: ${status}`);
  return { id: str(body.id), status, requestedAt: str(body.requestedAt), purgeAfter: str(body.purgeAfter) };
}

// The request the user can still cancel, if any. The list is newest first.
export function openRequest(requests: DeletionRequest[]): DeletionRequest | null {
  return requests.find((request) => request.status === 'REQUESTED') ?? null;
}

export async function requestDeletion(): Promise<DeletionRequest> {
  const { data } = await api.post<unknown>(REQUESTS);
  return parseDeletionRequest(data);
}

export async function getOpenDeletion(): Promise<DeletionRequest | null> {
  const { data } = await api.get<unknown>(REQUESTS);
  return openRequest(arr(data).map(parseDeletionRequest));
}

export async function cancelDeletion(id: string): Promise<DeletionRequest> {
  const { data } = await api.post<unknown>(`${REQUESTS}/${encodeURIComponent(id)}/cancel`);
  return parseDeletionRequest(data);
}

// Ends every session of the account (other phones, the web app), not only this one.
export async function signOutEverywhere(): Promise<void> {
  await api.post('/api/auth/logout-all');
}
