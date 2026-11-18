import { loadSetupConfig } from '@/features/iosSetup/config';
import type { CaptureConfig } from '@/features/iosSetup/types';

export const DEFAULT_CAPTURE_CONFIG: CaptureConfig = {
  matchWindowMs: 10 * 60_000,
  walletHoldMs: 2 * 60_000,
  incompleteWaitMs: 15 * 60_000,
  reminderDays: 7,
};

/** Defaults, overridden by whatever the setup configuration (later served by the backend) says. */
export const captureConfig = (): CaptureConfig => ({ ...DEFAULT_CAPTURE_CONFIG, ...loadSetupConfig().capture });
