import { useCallback, useRef } from 'react';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RINGTONE_STORAGE_KEY, RINGTONES } from '@/hooks/useRingtone';

export const SOUND_MAP: Record<string, any> = {
  'mixkit-access-allowed-tone-2869': require('../assets/sounds/mixkit-access-allowed-tone-2869.wav'),
  'mixkit-bell-notification-933': require('../assets/sounds/mixkit-bell-notification-933.wav'),
  'mixkit-clear-announce-tones-2861': require('../assets/sounds/mixkit-clear-announce-tones-2861.wav'),
  'mixkit-game-notification-wave-alarm-987': require('../assets/sounds/mixkit-game-notification-wave-alarm-987.wav'),
  'mixkit-happy-bells-notification-937': require('../assets/sounds/mixkit-happy-bells-notification-937.wav'),
  'mixkit-urgent-simple-tone-loop-2976': require('../assets/sounds/mixkit-urgent-simple-tone-loop-2976.wav'),
};

export const useAlertSound = () => {
  const soundRef = useRef<AudioPlayer | null>(null);
  const activeSoundIdRef = useRef<string | null>(null);

  const stopAlert = useCallback(async () => {
    if (!soundRef.current) {
      activeSoundIdRef.current = null;
      return;
    }

    try {
      soundRef.current.pause();
    } catch {
      // Keep cleanup resilient when stop is called while not playing.
    }

    try {
      await soundRef.current.seekTo(0);
    } catch {
      // Ignore seek failures; cleanup continues.
    }

    soundRef.current.remove();

    soundRef.current = null;
    activeSoundIdRef.current = null;
  }, []);

  const playAlertLoop = useCallback(async () => {
    const storedId = await AsyncStorage.getItem(RINGTONE_STORAGE_KEY);
    const defaultId = RINGTONES[0]?.id;
    const selectedId = storedId && SOUND_MAP[storedId] ? storedId : defaultId;

    if (!selectedId || !SOUND_MAP[selectedId]) {
      return;
    }

    if (activeSoundIdRef.current === selectedId && soundRef.current) {
      if (!soundRef.current.playing) {
        soundRef.current.play();
      }
      return;
    }

    await stopAlert();

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });

    const nextSound = createAudioPlayer(SOUND_MAP[selectedId]);
    nextSound.loop = true;
    nextSound.volume = 1;
    nextSound.play();

    soundRef.current = nextSound;
    activeSoundIdRef.current = selectedId;
  }, [stopAlert]);

  return {
    playAlertLoop,
    stopAlert,
  };
};
