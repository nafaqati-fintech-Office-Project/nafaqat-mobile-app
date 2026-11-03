import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getPlan, setPlan as savePlan } from './planStore';
import type { PlanId } from './plans';

// The current plan, re-read whenever the screen comes into focus so a change on the plans screen
// shows on the screen the user returns to. null until the first read finishes.
export function usePlan() {
  const [plan, setPlanState] = useState<PlanId | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getPlan().then((value) => {
        if (active) setPlanState(value);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const change = useCallback(async (next: PlanId) => {
    await savePlan(next);
    setPlanState(next);
  }, []);

  return { plan, setPlan: change };
}
