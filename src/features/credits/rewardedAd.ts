import { claimMockReward } from './creditsApi';

// Shows one rewarded ad and resolves true when the user earned the reward (the credit itself is added by the server).
//
// Production: this is the one place the ad SDK plugs in (react-native-google-mobile-ads, a native module, so it needs a
// development build). Show the ad with ServerSideVerificationOptions { userId } so AdMob calls billing-service when the
// ad completes. Until that is wired, ads are off outside development and the credit prompt does not offer them.
export const ADS_AVAILABLE: boolean = __DEV__;

export async function watchRewardedAd(): Promise<boolean> {
  if (!ADS_AVAILABLE) return false;
  await claimMockReward();
  return true;
}
