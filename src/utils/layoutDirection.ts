import { Platform, type ViewStyle } from 'react-native';

// Keeps a view's layout direction fixed. react-native-web has no `direction` style (the page's dir
// attribute does that job), so only the native apps get it.
export const layoutDirection = (direction: 'ltr' | 'rtl'): ViewStyle =>
  Platform.OS === 'web' ? {} : { direction };
