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
  colors: ReturnType<typeof getColors>;
}

const StallCard = ({ label, active, colors }: StallCardProps) => {
  const iconOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
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

  const styles = createStallCardStyles(colors, active);
  const animatedIconStyle = [styles.iconWrap, { opacity: iconOpacity }];
  const safeIconStyle = [styles.iconWrap, styles.safeIconWrap];

  return (
    <View style={styles.cardWrap}>
      <View style={styles.roofCap} />
      <View style={styles.houseBody}>
        <View style={styles.accentBar} />
        <View style={styles.contentArea}>
          <Text style={styles.label}>{label}</Text>
          {active ? (
            <Animated.View style={animatedIconStyle}>
              <MaterialCommunityIcons
                name={'fire' as never}
                size={34}
                color={'#FF453A'}
              />
            </Animated.View>
          ) : (
            <View style={safeIconStyle}>
              <MaterialCommunityIcons
                name={'shield-check' as never}
                size={34}
                color={colors.accentSafe}
              />
            </View>
          )}
          <Text style={styles.statusText}>{active ? 'Fire Detected!' : 'Safe'}</Text>
        </View>
      </View>
    </View>
  );
};

const StallMonitor = ({ status, stall, resolved }: StallMonitorProps) => {
  const { colorScheme: scheme } = useAppTheme();
  const colors = getColors(scheme);

  const isFireActive = status === 'fire' && !resolved;
  const stall1Active = isFireActive && (stall === 'stall_1' || stall === 'both');
  const stall2Active = isFireActive && (stall === 'stall_2' || stall === 'both');

  return (
    <View style={styles.container}>
      <StallCard label="Stall 1" active={stall1Active} colors={colors} />
      <StallCard label="Stall 2" active={stall2Active} colors={colors} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
});

const createStallCardStyles = (
  colors: ReturnType<typeof getColors>,
  active: boolean
) =>
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
      borderBottomColor: active ? colors.accentFire : colors.accentSafe,
      marginBottom: -2,
    },
    houseBody: {
      minHeight: 170,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: active ? colors.accentFire : colors.accentSafe,
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
      backgroundColor: active ? colors.accentFire : colors.accentSafe,
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
      color: active ? colors.accentFire : colors.accentSafe,
    },
  });

export default StallMonitor;
