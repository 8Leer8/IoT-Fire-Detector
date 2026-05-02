import { useEffect, useRef } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Animated,
  ColorSchemeName,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

interface StallMonitorProps {
  status: 'fire' | 'normal';
  stall: 'stall_1' | 'stall_2' | 'both' | null;
  resolved: boolean;
  isOnline: boolean;
  lastSeen: string;
}

const getColors = (scheme: ColorSchemeName) => {
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

interface StallCardProps {
  label: 'Stall 1' | 'Stall 2';
  active: boolean;
  isOnline: boolean;
  lastSeenLabel: string;
  colors: ReturnType<typeof getColors>;
}

const StallCard = ({ label, active, isOnline, lastSeenLabel, colors }: StallCardProps) => {
  const iconOpacity = useRef(new Animated.Value(1)).current;
  const shimmerProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active && isOnline) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(iconOpacity, {
            toValue: 0.3,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }

    iconOpacity.setValue(1);
    return undefined;
  }, [active, iconOpacity]);

  useEffect(() => {
    if (!isOnline) {
      const loop = Animated.loop(
        Animated.timing(shimmerProgress, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }

    shimmerProgress.setValue(0);
    return undefined;
  }, [isOnline, shimmerProgress]);

  const styles = createStallCardStyles(colors);
  const animatedIconStyle = [styles.iconWrap, { opacity: iconOpacity }];
  const safeIconStyle = [styles.iconWrap, styles.safeIconWrap];
  const statusColor = active ? colors.accentFire : isOnline ? colors.accentSafe : colors.accentOffline;
  const statusLabel = active ? 'Fire Detected!' : isOnline ? 'Safe' : 'Waiting for connection';
  const iconName = !isOnline ? 'wifi-off' : active ? 'fire' : 'shield-check';
  const iconColor = active ? '#FF453A' : isOnline ? colors.accentSafe : colors.accentOffline;
  const shimmerTranslate = shimmerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 140],
  });

  return (
    <View style={styles.cardWrap}>
      <View style={[styles.roofCap, { borderBottomColor: statusColor }]} />
      <View style={[styles.houseBody, { borderColor: statusColor }]}>
        <View style={[styles.accentBar, { backgroundColor: statusColor }]} />
        <View style={styles.contentArea}>
          <Text style={styles.label}>{label}</Text>
          {active && isOnline ? (
            <Animated.View style={animatedIconStyle}>
              <MaterialCommunityIcons
                name={(iconName as never)}
                size={34}
                color={iconColor}
              />
            </Animated.View>
          ) : (
            <View style={safeIconStyle}>
              <MaterialCommunityIcons
                name={(iconName as never)}
                size={34}
                color={iconColor}
              />
            </View>
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          {lastSeenLabel ? (
            <Text style={styles.lastSeenText}>{lastSeenLabel}</Text>
          ) : null}
          {!isOnline ? (
            <View style={styles.skeletonWrap}>
              <View style={styles.skeletonBar}>
                <Animated.View
                  style={[
                    styles.skeletonHighlight,
                    { transform: [{ translateX: shimmerTranslate }] },
                  ]}
                />
              </View>
              <View style={[styles.skeletonBar, styles.skeletonBarShort]}>
                <Animated.View
                  style={[
                    styles.skeletonHighlight,
                    { transform: [{ translateX: shimmerTranslate }] },
                  ]}
                />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const StallMonitor = ({ status, stall, resolved, isOnline, lastSeen }: StallMonitorProps) => {
  const { colorScheme: scheme } = useAppTheme();
  const colors = getColors(scheme);

  const isFireActive = isOnline && status === 'fire' && !resolved;
  const stall1Active = isFireActive && (stall === 'stall_1' || stall === 'both');
  const stall2Active = isFireActive && (stall === 'stall_2' || stall === 'both');

  const formatLastSeen = (value: string) => {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const lastSeenLabel = formatLastSeen(lastSeen);
  const lastSeenText = lastSeenLabel ? `${isOnline ? 'Updated' : 'Last seen'}: ${lastSeenLabel}` : '';

  return (
    <View style={styles.container}>
      <StallCard
        label="Stall 1"
        active={stall1Active}
        isOnline={isOnline}
        lastSeenLabel={lastSeenText}
        colors={colors}
      />
      <StallCard
        label="Stall 2"
        active={stall2Active}
        isOnline={isOnline}
        lastSeenLabel={lastSeenText}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
});

const createStallCardStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    cardWrap: {
      flex: 1,
    },
    roofCap: {
      alignSelf: 'center',
      width: 0,
      height: 0,
      borderLeftWidth: 30,
      borderRightWidth: 30,
      borderBottomWidth: 18,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: colors.accentSafe,
      marginBottom: -2,
    },
    houseBody: {
      minHeight: 170,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.accentSafe,
      backgroundColor: colors.card,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 3,
      overflow: 'hidden',
    },
    accentBar: {
      height: 8,
      backgroundColor: colors.accentSafe,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    contentArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    label: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    iconWrap: {
      marginTop: 6,
      marginBottom: 6,
    },
    safeIconWrap: {
      opacity: 1,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accentSafe,
    },
    lastSeenText: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    skeletonWrap: {
      marginTop: 8,
      width: '100%',
      gap: 8,
      alignItems: 'center',
    },
    skeletonBar: {
      width: 120,
      height: 10,
      borderRadius: 6,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    skeletonBarShort: {
      width: 90,
    },
    skeletonHighlight: {
      width: 50,
      height: 10,
      borderRadius: 6,
      backgroundColor: colors.card,
      opacity: 0.35,
    },
  });

export default StallMonitor;
