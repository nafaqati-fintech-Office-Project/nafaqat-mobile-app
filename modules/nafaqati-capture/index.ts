import { requireOptionalNativeModule } from 'expo';

// What the Shortcuts actions left behind. Only the iPhone build has the native side; everywhere else (Android, web,
// Expo Go, tests) the calls quietly return nothing.

export type CapturedItem = {
  /** File name in the native queue; hand it back to `acknowledge`. */
  id: string;
  kind: 'bank' | 'wallet';
  /** Milliseconds since 1970 when the action ran. */
  receivedAt: number;
  /** Bank message: the raw text (held only until it is parsed) and the optional sender. */
  text?: string;
  sender?: string;
  /** Wallet payment: all three can be empty and the amount can be zero. */
  merchant?: string;
  amount?: string;
  card?: string;
};

export type CaptureNativeStatus = {
  lastBankAt: number;
  lastWalletAt: number;
  lastTestAt: number;
  available: boolean;
};

type Native = {
  drain(): Promise<CapturedItem[]>;
  acknowledge(ids: string[]): Promise<void>;
  getStatus(): Promise<CaptureNativeStatus>;
  clearAll(): Promise<void>;
};

const native = requireOptionalNativeModule<Native>('NafaqatiCapture');

export const isCaptureAvailable = (): boolean => native !== null;

export const drainCaptured = async (): Promise<CapturedItem[]> => (native ? await native.drain() : []);

export const acknowledgeCaptured = async (ids: string[]): Promise<void> => {
  if (native && ids.length > 0) await native.acknowledge(ids);
};

export const captureStatus = async (): Promise<CaptureNativeStatus> =>
  native ? await native.getStatus() : { lastBankAt: 0, lastWalletAt: 0, lastTestAt: 0, available: false };

export const clearCaptured = async (): Promise<void> => {
  if (native) await native.clearAll();
};
