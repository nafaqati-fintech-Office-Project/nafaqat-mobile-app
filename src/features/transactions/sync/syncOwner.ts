import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAxiosError } from 'axios';

import { accountHasTransactions, findByExternalId } from './syncApi';
import { externalId } from './syncMapping';
import { newestSyncedRow, resetSyncState } from './syncRepo';
import { devLog } from '@/utils/devLog';

const KEY = 'sync.owner';

// The transactions on this phone come from its SMS inbox, whichever account is signed in, but each row remembers
// the id the server gave it, and that id belongs to the account it was sent to. A different account has none of
// them, so it would never get them. This notices that and makes every row go again. Returns whether it did.
//
// The account the rows were sent to is remembered. When that is not known yet (the phone synced before this
// existed), the newest synced row is looked up on the server: if the signed-in account has it, nothing changes.
// Never throws; when the server cannot answer it decides nothing and asks again next time.
type Verdict = 'ours' | 'not-ours' | 'unknown';

// Does the signed-in account hold the newest row the phone believes was sent?
async function probe(sample: { dedupeKey: string; serverId: string }): Promise<Verdict> {
  try {
    const found = await findByExternalId(externalId({ dedupeKey: sample.dedupeKey }));
    return found === sample.serverId ? 'ours' : 'not-ours';
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    if (status === 404) return 'not-ours';
    // No reply, an expired session, rate limiting or a server-side failure: ask again later.
    if (status === undefined || status === 401 || status === 408 || status === 429 || status >= 500) {
      devLog(`[sync-owner] probe could not decide: ${status ?? 'no reply'}`);
      return 'unknown';
    }
    // The lookup is refused (a server without that endpoint answers 400). Fall back to a coarser question: does the
    // account have any transaction at all? If not, the ids on the phone cannot be its own. If it has some, they are
    // assumed to be (they cannot be told apart), and the sync keeps going as before.
    try {
      return (await accountHasTransactions()) ? 'ours' : 'not-ours';
    } catch {
      return 'unknown';
    }
  }
}

export async function claimLocalRows(userId: string): Promise<boolean> {
  try {
    const owner = await AsyncStorage.getItem(KEY);
    devLog(`[sync-owner] stored owner ${owner === null ? 'none' : owner === userId ? 'same account' : 'another account'}`);
    if (owner === userId) return false;

    if (owner === null) {
      const sample = await newestSyncedRow();
      if (sample) {
        const verdict = await probe(sample);
        devLog(`[sync-owner] verdict: ${verdict}`);
        if (verdict === 'unknown') return false;
        if (verdict === 'ours') {
          await AsyncStorage.setItem(KEY, userId);
          return false;
        }
      }
    }

    await resetSyncState();
    await AsyncStorage.setItem(KEY, userId);
    devLog('[sync-owner] rows will be sent again to this account');
    return true;
  } catch (error) {
    devLog(`[sync-owner] failed: ${String(error)}`);
    return false;
  }
}
