import { useEffect, useRef, useState } from 'react';

import type { TransactionItem } from './transactionsApi';
import { getTransaction } from './transactionsService';

// A transaction to point out: id from the notification, key different for every tap.
export type HighlightRequest = { id: string; key: string };

type Pinned = { key: string; item: TransactionItem | null };

// The transaction a notification was about. When it is among the loaded rows the screen scrolls to it;
// otherwise (an older one) it is fetched on its own and shown above the list. `ready` must be true only
// once the unfiltered list is loaded. onMissing runs when it cannot be found at all.
export function useTransactionHighlight(
  request: HighlightRequest | null,
  items: TransactionItem[],
  ready: boolean,
  onMissing: () => void,
) {
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const fetched = useRef<string | null>(null);
  const missing = useRef(onMissing);
  useEffect(() => {
    missing.current = onMissing;
  }, [onMissing]);

  const inList = request !== null && ready && items.some((row) => row.id === request.id);

  useEffect(() => {
    if (!request || !ready || inList || fetched.current === request.key) return;
    fetched.current = request.key;
    getTransaction(request.id)
      .then((item) => setPinned({ key: request.key, item }))
      .catch(() => {
        setPinned({ key: request.key, item: null });
        missing.current();
      });
  }, [request, ready, inList]);

  const current = request && pinned?.key === request.key && !inList ? pinned.item : null;
  return { inList, pinned: current };
}
