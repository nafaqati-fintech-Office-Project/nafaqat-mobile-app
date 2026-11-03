import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PlanId } from './plans';

// There is no billing backend yet, so the plan lives on the phone. Everyone starts on Free; in
// auth-bypass mode the Upgrade button switches this to Premium so the paid features can be tried.
const KEY = 'nafaqati.plan';

export async function getPlan(): Promise<PlanId> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'premium' ? 'premium' : 'free';
  } catch {
    return 'free';
  }
}

export async function setPlan(plan: PlanId): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, plan);
  } catch {
    // Non-fatal: the plan simply resets to Free next launch.
  }
}
