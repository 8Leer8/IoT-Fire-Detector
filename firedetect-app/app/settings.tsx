import { useEffect, useRef, useState, type ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemePreference, useAppTheme } from '@/hooks/useAppTheme';
import { SOUND_MAP } from '@/hooks/useAlertSound';
import { RINGTONES, useRingtone } from '@/hooks/useRingtone';

interface ThemeOption {
  label: string;
  value: ThemePreference;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
}

interface RadioRowProps {
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}

const getColors = (scheme: 'dark' | 'light' | null | undefined) => {
  if (scheme === 'dark') {
    return {
      background: '#0D0D0D',
      card: '#1C1C1E',
      textPrimary: '#F5F5F5',
      textSecondary: '#A0A0A0',
      accentFire: '#FF453A',
      accentSafe: '#30D158',
      accentOffline: '#636366',
      border: '#2C2C2E',
    };
  }

  return {
    background: '#F5F5F5',
    card: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B6B6B',
    accentFire: '#FF3B30',
    accentSafe: '#34C759',
    accentOffline: '#8E8E93',
    border: '#E0E0E0',
  };
};

const RadioRow = ({ label, icon, active, onPress, styles }: RadioRowProps) => {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={20} style={styles.leftIcon} />
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={active ? styles.radioSelectedOuter : styles.radioOuter}>
        <View style={active ? styles.radioSelectedInner : styles.radioInnerHidden} />
      </View>
    </Pressable>
  );
};

const SettingsScreen = () => {
  const { preference, setPreference, colorScheme } = useAppTheme();
  const { selectedRingtone, saveRingtone } = useRingtone();
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);

  const previewRef = useRef<AudioPlayer | null>(null);
  const previewListenerRef = useRef<{ remove: () => void } | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const themeOptions: ThemeOption[] = [
    { label: 'System Default', value: 'system', icon: 'theme-light-dark' },
    { label: 'Light', value: 'light', icon: 'weather-sunny' },
    { label: 'Dark', value: 'dark', icon: 'moon-waning-crescent' },
  ];

  const stopPreview = async () => {
    if (!previewRef.current) {
      setPreviewingId(null);
      return;
    }

    previewListenerRef.current?.remove();
    previewListenerRef.current = null;

    try {
      previewRef.current.pause();
    } catch {}

    try {
      await previewRef.current.seekTo(0);
    } catch {}

    previewRef.current.remove();
    previewRef.current = null;
    setPreviewingId(null);
  };

  useEffect(() => {
    return () => {
      void stopPreview();
    };
  }, []);

  const selectAndPreviewRingtone = async (ringtoneId: string) => {
    const source = SOUND_MAP[ringtoneId];
    if (!source) {
      return;
    }

    await saveRingtone(ringtoneId);
    await stopPreview();

    const next = createAudioPlayer(source);
    next.loop = false;
    next.volume = 1;
    next.play();

    previewRef.current = next;
    setPreviewingId(ringtoneId);

    previewListenerRef.current = next.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        void stopPreview();
      }
    });
  };

  const selectedLabel =
    RINGTONES.find((ringtone) => ringtone.id === selectedRingtone)?.label ??
    RINGTONES[0]?.label ??
    'None';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.sectionWrap}>
          <Text style={styles.title}>Theme Mode</Text>
          <Text style={styles.subtitle}>Choose how the app appearance should behave.</Text>

          <View style={styles.listWrap}>
            {themeOptions.map((option) => (
              <RadioRow
                key={option.value}
                label={option.label}
                icon={option.icon}
                active={preference === option.value}
                onPress={() => setPreference(option.value)}
                styles={styles}
              />
            ))}
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.title}>Alert Ringtone</Text>
          <Text style={styles.subtitle}>Tap a bundled sound to preview and set it instantly.</Text>

          <View style={styles.listWrap}>
            {RINGTONES.map((ringtone) => {
              const isSaved = ringtone.id === selectedRingtone;
              const isPreviewing = ringtone.id === previewingId;

              return (
                <RadioRow
                  key={ringtone.id}
                  label={ringtone.label}
                  icon={isPreviewing ? 'volume-high' : 'music-note'}
                  active={isSaved}
                  onPress={() => {
                    void selectAndPreviewRingtone(ringtone.id);
                  }}
                  styles={styles}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    contentContainer: {
      paddingTop: 4,
      paddingBottom: 20,
      gap: 18,
    },
    sectionWrap: {
      gap: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    selectedToneWrap: {
      marginTop: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedToneText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    listWrap: {
      marginTop: 4,
      gap: 10,
    },
    row: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    leftIcon: {
      color: colors.textSecondary,
      marginRight: 12,
    },
    rowTextWrap: {
      flex: 1,
      paddingRight: 12,
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    radioOuter: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    radioSelectedOuter: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.accentFire,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    radioSelectedInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accentFire,
    },
    radioInnerHidden: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'transparent',
    },
  });

export default SettingsScreen;
