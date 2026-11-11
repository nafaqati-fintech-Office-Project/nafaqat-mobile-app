import { useEffect } from 'react';

import { recategorizeOldRows } from './recategorize';

// Once the person is signed in, looks again at transactions saved before the categories improved (see
// recategorizeOldRows). It does nothing after the first complete pass.
export function useRecategorizeOldRows(enabled: boolean): void {
  useEffect(() => {
    if (enabled) void recategorizeOldRows();
  }, [enabled]);
}
