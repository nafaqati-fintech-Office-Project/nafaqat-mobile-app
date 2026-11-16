import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AUTH_BYPASS } from '@/config/flags';
import { getMe, type EntitlementValue, type Me } from '@/features/billing/billingApi';
import { getPlan, setPlan as savePlan } from './planStore';
import { canUse, entitlementKey, type PlanFeature, type PlanId } from './plans';

const allowed = (value: EntitlementValue | undefined) =>
  value === true || value === 'unlimited' || (typeof value === 'number' && value > 0);

// The current plan, re-read whenever the screen comes into focus so a change on the plans screen shows on the screen the
// user returns to. null until the first read finishes.
//
// Signed in, the server (billing-service) decides: `plan` and `can()` come from GET /api/billing/me. In auth-bypass (demo)
// mode there is no session, so the plan is the one kept on the phone and `setPlan` switches it.
export function usePlan() {
  const [plan, setPlanState] = useState<PlanId | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  const refresh = useCallback(async () => {
    if (AUTH_BYPASS) {
      setPlanState(await getPlan());
      return;
    }
    try {
      const next = await getMe();
      setMe(next);
      setPlanState(next.plan);
    } catch {
      // Could not ask the server: keep what we had, and treat a user we know nothing about as Free.
      setPlanState((current) => current ?? 'free');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const change = useCallback(async (next: PlanId) => {
    await savePlan(next);
    setPlanState(next);
  }, []);

  // Whether the user may use a feature. null while the plan is still loading.
  const can = useCallback(
    (feature: PlanFeature): boolean | null => {
      if (plan === null) return null;
      const key = entitlementKey(feature);
      if (!AUTH_BYPASS && me && key) return allowed(me.entitlements[key]);
      return canUse(plan, feature);
    },
    [plan, me],
  );

  return { plan, me, can, refresh, setPlan: change };
}
