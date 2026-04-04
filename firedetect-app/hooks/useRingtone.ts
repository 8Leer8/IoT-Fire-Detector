import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Ringtone {
  id: string;
  label: string;
  filename: string;
}

export const RINGTONE_STORAGE_KEY = 'selectedRingtone';
export const DEFAULT_NOTIFICATION_CHANNEL_ID = 'default';

const SOUND_FILENAMES = [
  'mixkit_urgent_simple_tone_loop_2976.wav',
  'mixkit_access_allowed_tone_2869.wav',
  'mixkit_bell_notification_933.wav',
  'mixkit_clear_announce_tones_2861.wav',
  'mixkit_game_notification_wave_alarm_987.wav',
  'mixkit_happy_bells_notification_937.wav',
] as const;

const toReadableLabel = (filename: string): string => {
  const withoutExtension = filename.replace(/\.wav$/i, '');
  const withoutPrefix = withoutExtension.replace(/^mixkit[_-]?/, '');
  const withoutTrailingNumbers = withoutPrefix.replace(/[_-]?\d+$/, '');

  return withoutTrailingNumbers
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const RINGTONES: Ringtone[] = SOUND_FILENAMES.map((filename) => {
  const id = filename.replace(/\.wav$/i, '');
  return {
    id,
    label: toReadableLabel(filename),
    filename,
  };
});

export const getNotificationChannelIdForRingtone = (ringtoneId: string): string => {
  if (RINGTONES.some((ringtone) => ringtone.id === ringtoneId)) {
    return ringtoneId;
  }
  return DEFAULT_NOTIFICATION_CHANNEL_ID;
};

const getDefaultRingtone = (): Ringtone => RINGTONES[0];

export const useRingtone = () => {
  const [selectedRingtone, setSelectedRingtone] = useState<string>(getDefaultRingtone().id);

  useEffect(() => {
    const loadSelectedRingtone = async () => {
      try {
        const stored = await AsyncStorage.getItem(RINGTONE_STORAGE_KEY);
        if (stored && RINGTONES.some((ringtone) => ringtone.id === stored)) {
          setSelectedRingtone(stored);
          return;
        }

        const defaultId = getDefaultRingtone().id;
        await AsyncStorage.setItem(RINGTONE_STORAGE_KEY, defaultId);
        setSelectedRingtone(defaultId);
      } catch {
        setSelectedRingtone(getDefaultRingtone().id);
      }
    };

    void loadSelectedRingtone();
  }, []);

  const saveRingtone = async (id: string) => {
    if (!RINGTONES.some((ringtone) => ringtone.id === id)) {
      return;
    }

    await AsyncStorage.setItem(RINGTONE_STORAGE_KEY, id);
    setSelectedRingtone(id);
  };

  const getSelectedRingtone = (): Ringtone => {
    return RINGTONES.find((ringtone) => ringtone.id === selectedRingtone) ?? getDefaultRingtone();
  };

  return {
    selectedRingtone,
    saveRingtone,
    getSelectedRingtone,
  };
};
