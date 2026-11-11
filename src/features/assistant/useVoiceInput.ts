import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { Language } from '@/i18n';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;
type Subscription = { remove: () => void };

let loaded: Promise<SpeechModule | null> | null = null;

// The speech module, or null where it cannot run: importing it touches native code, which fails in Expo Go
// and in a development build made before the package was added. Without it the mic button is hidden.
function loadSpeech(): Promise<SpeechModule | null> {
  loaded ??= (async () => {
    try {
      if (Platform.OS !== 'web' && (await import('expo')).isRunningInExpoGo()) return null;
      return (await import('expo-speech-recognition')).ExpoSpeechRecognitionModule;
    } catch {
      return null;
    }
  })();
  return loaded;
}

const LOCALES: Record<Language, string> = { en: 'en-US', ar: 'ar-SA' };

export type VoiceProblem = 'denied' | 'unavailable' | 'failed';

// Speech to text with the phone's own speech service (Google on Android, Apple on iOS, the browser on web).
// The words go to onText as they are recognised; nothing is sent to our servers.
export function useVoiceInput(language: Language, onText: (text: string) => void, onProblem: (problem: VoiceProblem) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const subscriptions = useRef<Subscription[]>([]);
  const module = useRef<SpeechModule | null>(null);
  // The listeners outlive a render, so they read the latest callbacks from here.
  const handlers = useRef({ onText, onProblem });
  useEffect(() => {
    handlers.current = { onText, onProblem };
  }, [onText, onProblem]);

  useEffect(() => {
    let active = true;
    void loadSpeech().then((speech) => {
      module.current = speech;
      if (!active || !speech) return;
      try {
        setSupported(speech.isRecognitionAvailable());
      } catch {
        setSupported(false);
      }
    });
    return () => {
      active = false;
      subscriptions.current.forEach((s) => s.remove());
      subscriptions.current = [];
      try {
        module.current?.abort();
      } catch {
        // Not listening.
      }
    };
  }, []);

  const release = () => {
    subscriptions.current.forEach((s) => s.remove());
    subscriptions.current = [];
    setListening(false);
  };

  const start = useCallback(async () => {
    const speech = module.current;
    if (!speech) return handlers.current.onProblem('unavailable');
    const permission = await speech.requestPermissionsAsync().catch(() => null);
    if (!permission?.granted) return handlers.current.onProblem('denied');

    release();
    subscriptions.current = [
      speech.addListener('result', (event) => {
        const text = event.results[0]?.transcript;
        if (text) handlers.current.onText(text);
      }),
      speech.addListener('error', (event) => {
        // Silence and a stop by the user are not problems worth a message.
        if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'speech-timeout') return;
        handlers.current.onProblem(event.error === 'not-allowed' ? 'denied' : event.error === 'language-not-supported' ? 'unavailable' : 'failed');
      }),
      speech.addListener('end', release),
    ];
    try {
      speech.start({ lang: LOCALES[language], interimResults: true, continuous: false, addsPunctuation: true });
      setListening(true);
    } catch {
      release();
      handlers.current.onProblem('failed');
    }
  }, [language]);

  const stop = useCallback(() => {
    try {
      module.current?.stop();
    } catch {
      release();
    }
  }, []);

  return { supported, listening, start, stop };
}
