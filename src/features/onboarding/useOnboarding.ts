import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  useWindowDimensions,
  type FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { slides, type Slide } from './slides';
import { setOnboardingSeen } from '@/storage/flags';

type FinishTarget = '/language' | '/login';
type FinishSource = 'getStarted' | 'signIn';

export function useOnboarding() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState<FinishSource | null>(null);

  const lastIndex = slides.length - 1;
  const isLast = index === lastIndex;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const skip = () => {
    listRef.current?.scrollToIndex({ index: lastIndex, animated: true });
    setIndex(lastIndex);
  };

  const finish = async (source: FinishSource, target: FinishTarget) => {
    if (finishing) return;
    setFinishing(source);
    await setOnboardingSeen(true);
    router.replace(target);
  };

  return { listRef, width, index, isLast, finishing, onScrollEnd, skip, finish };
}
