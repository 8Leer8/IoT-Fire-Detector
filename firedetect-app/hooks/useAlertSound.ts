import { useCallback, useRef } from 'react';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration } from 'react-native';

import { RINGTONE_STORAGE_KEY, RINGTONES } from '@/hooks/useRingtone';

export const SOUND_MAP: Record<string, any> = {
  'mixkit_access_allowed_tone_2869': require('../assets/sounds/mixkit_access_allowed_tone_2869.wav'),
  'mixkit_bell_notification_933': require('../assets/sounds/mixkit_bell_notification_933.wav'),
  'mixkit_clear_announce_tones_2861': require('../assets/sounds/mixkit_clear_announce_tones_2861.wav'),
  'mixkit_game_notification_wave_alarm_987': require('../assets/sounds/mixkit_game_notification_wave_alarm_987.wav'),
  'mixkit_happy_bells_notification_937': require('../assets/sounds/mixkit_happy_bells_notification_937.wav'),
  'mixkit_urgent_simple_tone_loop_2976': require('../assets/sounds/mixkit_urgent_simple_tone_loop_2976.wav'),
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
    Vibration.cancel();

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
    Vibration.vibrate([0, 500, 250, 500], true);

    soundRef.current = nextSound;
    activeSoundIdRef.current = selectedId;
  }, [stopAlert]);

  return {
    playAlertLoop,
    stopAlert,
  };
};
