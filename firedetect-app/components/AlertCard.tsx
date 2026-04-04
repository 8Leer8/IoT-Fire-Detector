import {
	ColorSchemeName,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/hooks/useAppTheme';

interface AlertCardProps {
	status: 'fire' | 'normal';
	stall: 'stall_1' | 'stall_2' | 'both';
	resolved: boolean;
	resolvedAt?: string | null;
	triggeredAt: string;
	message: string;
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

const AlertCard = ({ status, stall, resolved, resolvedAt, triggeredAt, message }: AlertCardProps) => {
	const { colorScheme: scheme } = useAppTheme();
	const colors = getColors(scheme);
	const styles = createStyles(colors);

	const isFire = status === 'fire' && !resolved;
	const iconColor = isFire ? '#FF453A' : '#30D158';
	const badgeLabel = isFire ? 'FIRE' : 'SAFE';
	const stallLabel = stall === 'stall_1' ? 'Stall 1' : stall === 'stall_2' ? 'Stall 2' : 'Both';

	return (
		<View style={styles.container}> 
			<MaterialCommunityIcons
				name={(isFire ? 'fire' : 'shield-check') as never}
				size={16}
				color={iconColor}
			/>

			<View style={styles.centerContent}>
				<Text style={styles.status}>
					{resolved ? 'Resolved' : isFire ? 'Fire Detected' : 'Normal'}
				</Text>
				<Text style={styles.timestamp}> 
					Started: {new Date(triggeredAt).toLocaleString()}
				</Text>
				{resolved && resolvedAt ? (
					<Text style={styles.resolvedText}>
						Resolved: {new Date(resolvedAt).toLocaleString()}
					</Text>
				) : null}
				{message ? (
					<Text numberOfLines={1} style={styles.message}> 
						{message}
					</Text>
				) : null}
			</View>

			<View style={styles.rightContent}>
				{!resolved ? (
					<View style={[styles.badge, { backgroundColor: iconColor, borderColor: iconColor }]}> 
						<Text style={styles.badgeText}>{badgeLabel}</Text>
					</View>
				) : null}
				<Text style={styles.stallLabel}>{stallLabel}</Text>
			</View>
		</View>
	);
};

const createStyles = (colors: ReturnType<typeof getColors>) =>
	StyleSheet.create({
		container: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 14,
			borderBottomWidth: 1,
			gap: 12,
			borderBottomColor: colors.border,
		},
		centerContent: {
			flex: 1,
		},
		status: {
			fontSize: 15,
			fontWeight: '700',
			color: colors.textPrimary,
		},
		timestamp: {
			marginTop: 3,
			fontSize: 13,
			color: colors.textSecondary,
		},
		message: {
			marginTop: 2,
			fontSize: 12,
			color: colors.textSecondary,
		},
		resolvedText: {
			marginTop: 2,
			fontSize: 12,
			fontWeight: '600',
			color: colors.textSecondary,
		},
		rightContent: {
			alignItems: 'center',
			gap: 4,
		},
		badge: {
			borderWidth: 1,
			borderRadius: 999,
			paddingVertical: 4,
			paddingHorizontal: 10,
			borderColor: colors.border,
		},
		badgeText: {
			fontSize: 11,
			fontWeight: '700',
			letterSpacing: 0.5,
			color: '#FFFFFF',
		},
		stallLabel: {
			fontSize: 11,
			fontWeight: '600',
			color: colors.textSecondary,
		},
	});

export default AlertCard;
