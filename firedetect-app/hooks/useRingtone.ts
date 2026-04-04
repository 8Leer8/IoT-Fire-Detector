import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Ringtone {
  id: string;
  label: string;
  filename: string;
}

export const RINGTONE_STORAGE_KEY = 'selectedRingtone';

const SOUND_FILENAMES = [
  'mixkit-urgent-simple-tone-loop-2976.wav',
  'mixkit-access-allowed-tone-2869.wav',
  'mixkit-bell-notification-933.wav',
  'mixkit-clear-announce-tones-2861.wav',
  'mixkit-game-notification-wave-alarm-987.wav',
  'mixkit-happy-bells-notification-937.wav',
] as const;

const toReadableLabel = (filename: string): string => {
  const withoutExtension = filename.replace(/\.wav$/i, '');
  const withoutPrefix = withoutExtension.replace(/^mixkit-/, '');
  const withoutTrailingNumbers = withoutPrefix.replace(/[-\d]+$/, '');

  return withoutTrailingNumbers
    .split('-')
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
