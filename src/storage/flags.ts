import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  onboardingSeen: 'nafaqati.onboardingSeen',
} as const;

type FlagName = keyof typeof KEYS;

async function getFlag(name: FlagName): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS[name])) === 'true';
  } catch {
    return false;
  }
}

async function setFlag(name: FlagName, value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS[name], String(value));
  } catch {
    // Non-fatal: the user simply sees onboarding again next launch.
  }
}

export const getOnboardingSeen = () => getFlag('onboardingSeen');
export const setOnboardingSeen = (value: boolean) => setFlag('onboardingSeen', value);
