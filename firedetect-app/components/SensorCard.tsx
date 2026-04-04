import {
	ColorSchemeName,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/hooks/useAppTheme';

interface SensorCardProps {
	isOnline: boolean;
	lastUpdated: string;
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

const SensorCard = ({ isOnline, lastUpdated }: SensorCardProps) => {
	const { colorScheme: scheme } = useAppTheme();
	const colors = getColors(scheme);
	const styles = createStyles(colors);

	const formatLastUpdated = (value: string) => {
		if (!value) {
			return 'Waiting for data...';
		}

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return 'Waiting for data...';
		}

		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	};

	return (
		<View style={styles.container}>
			<MaterialCommunityIcons
				name={(isOnline ? 'access-point' : 'access-point-off') as never}
				size={18}
				color={isOnline ? '#30D158' : '#636366'}
				style={styles.signalIcon}
			/>
			<View style={styles.content}>
				<Text style={styles.title}>ESP32 Sensor</Text>
				<Text style={styles.subtitle}>
					{isOnline ? 'Online' : 'Offline'}
				</Text>
				<Text style={styles.updated}>
					Last updated: {formatLastUpdated(lastUpdated)}
				</Text>
			</View>
		</View>
	);
};

const createStyles = (colors: ReturnType<typeof getColors>) =>
	StyleSheet.create({
		container: {
			borderWidth: 1,
			borderRadius: 16,
			padding: 16,
			flexDirection: 'row',
			alignItems: 'flex-start',
			gap: 12,
			backgroundColor: colors.card,
			borderColor: colors.border,
		},
		signalIcon: {
			marginTop: 2,
		},
		content: {
			flex: 1,
		},
		title: {
			fontSize: 17,
			fontWeight: '700',
			color: colors.textPrimary,
		},
		subtitle: {
			marginTop: 2,
			fontSize: 14,
			fontWeight: '500',
			color: colors.textSecondary,
		},
		updated: {
			marginTop: 8,
			fontSize: 13,
			color: colors.textSecondary,
		},
	});

export default SensorCard;
