import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import {
	ActivityIndicator,
	ColorSchemeName,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AlertCard from '@/components/AlertCard';
import SensorCard from '@/components/SensorCard';
import StallMonitor from '@/components/StallMonitor';
import {
	FireAlertItem,
	getAlertHistory,
	getLatestStatus,
	LatestStatusResponse,
	resolveStall,
	getSensorStatus,
	SensorStatusResponse,
} from '@/api/fireApi';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAlertSound } from '@/hooks/useAlertSound';
import usePushNotification from '@/hooks/usePushNotification';

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

const DashboardScreen = () => {
	const { colorScheme: scheme } = useAppTheme();
	const colors = getColors(scheme);
	const styles = createStyles(colors);
	const { playAlertLoop, stopAlert } = useAlertSound();

	usePushNotification();

	const [latestStatus, setLatestStatus] = useState<LatestStatusResponse>({
		id: null,
		status: 'normal',
		stall: null,
		resolved: true,
		resolved_at: null,
		triggered_at: undefined,
		message: '',
	});
	const [alerts, setAlerts] = useState<FireAlertItem[]>([]);
	const [sensorStatus, setSensorStatus] = useState<SensorStatusResponse>({ is_online: false, last_seen: '' });
	const [isOnline, setIsOnline] = useState(false);
	const [lastUpdated, setLastUpdated] = useState('Waiting for data...');
	const [isLoading, setIsLoading] = useState(true);
	const [isResolving, setIsResolving] = useState(false);

	const activeIncident = alerts.find((alert) => alert.is_active === true) ?? null;
	const stall1Active = activeIncident?.stall_1_active ?? false;
	const stall2Active = activeIncident?.stall_2_active ?? false;
	const stall1Resolved = activeIncident?.stall_1_resolved ?? false;
	const stall2Resolved = activeIncident?.stall_2_resolved ?? false;
	const hasActiveFire = Boolean(activeIncident?.is_active);

	const pollLatestStatus = async () => {
		try {
			const latest: LatestStatusResponse = await getLatestStatus();
			setLatestStatus(latest);
			setIsOnline(true);
			setLastUpdated(new Date().toLocaleTimeString());
		} catch {
			setLatestStatus({
				id: null,
				status: 'normal',
				stall: null,
				resolved: true,
				resolved_at: null,
				triggered_at: undefined,
				message: '',
			});
			setIsOnline(false);
			setLastUpdated(new Date().toLocaleTimeString());
		}
	};

	const pollAlertHistory = async () => {
		try {
			const history = await getAlertHistory();
			setAlerts(history);
		} catch {
			setAlerts([]);
		}
	};

	const pollSensorStatus = async () => {
		try {
			const sensor = await getSensorStatus();
			setSensorStatus(sensor);
		} catch {
			setSensorStatus({ is_online: false, last_seen: '' });
		}
	};

	const handleResolveStall1 = async (): Promise<void> => {
		if (isResolving) {
			return;
		}

		try {
			setIsResolving(true);
			await resolveStall('stall_1');
			await pollAlertHistory();
		} catch {
			return;
		} finally {
			setIsResolving(false);
		}
	};

	const handleResolveStall2 = async (): Promise<void> => {
		if (isResolving) {
			return;
		}

		try {
			setIsResolving(true);
			await resolveStall('stall_2');
			await pollAlertHistory();
		} catch {
			return;
		} finally {
			setIsResolving(false);
		}
	};

	useEffect(() => {
		if (hasActiveFire) {
			void playAlertLoop();
			return;
		}

		void stopAlert();
	}, [hasActiveFire, playAlertLoop, stopAlert]);

	useEffect(() => {
		return () => {
			void stopAlert();
		};
	}, [stopAlert]);

	useEffect(() => {
		let isMounted = true;

		const loadInitial = async () => {
			await Promise.all([pollLatestStatus(), pollAlertHistory(), pollSensorStatus()]);
			if (isMounted) {
				setIsLoading(false);
			}
		};

		void loadInitial();

		const latestStatusInterval = setInterval(() => {
			void pollLatestStatus();
		}, 5000);

		const alertHistoryInterval = setInterval(() => {
			void pollAlertHistory();
		}, 5000);

		const sensorStatusInterval = setInterval(() => {
			void pollSensorStatus();
		}, 5000);

		return () => {
			isMounted = false;
			clearInterval(latestStatusInterval);
			clearInterval(alertHistoryInterval);
			clearInterval(sensorStatusInterval);
		};
	}, []);

	if (isLoading) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.loaderWrap}>
					<ActivityIndicator size="large" color={colors.accentFire} />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				<View style={styles.topRow}>
					<View style={styles.titleRow}>
						<Ionicons name="flame" size={24} color={colors.accentFire} />
						<Text style={styles.title}>Senseflame</Text>
					</View>
					<Link href="/settings" asChild>
						<Pressable style={styles.settingsButton}>
							<Ionicons name="settings-outline" size={18} color={colors.textPrimary} />
						</Pressable>
					</Link>
				</View>
				<Text style={styles.subtitle}>Real-time monitoring</Text>

				<View style={styles.cardGap}>
					<SensorCard isOnline={sensorStatus.is_online} lastUpdated={sensorStatus.last_seen} />
				</View>

				<View style={styles.cardGap}>
					<StallMonitor
						status={hasActiveFire ? 'fire' : 'normal'}
						stall1Active={stall1Active}
						stall2Active={stall2Active}
						stall1Resolved={stall1Resolved}
						stall2Resolved={stall2Resolved}
						isOnline={sensorStatus.is_online}
						lastSeen={sensorStatus.last_seen}
					/>
				</View>

				{stall1Active && !stall1Resolved ? (
					<View style={styles.resolveWrap}>
						<Pressable
							style={[styles.resolveButton, isResolving ? styles.resolveButtonDisabled : null]}
							onPress={handleResolveStall1}
							disabled={isResolving}
						>
							<Text style={styles.resolveButtonText}>
								{isResolving ? 'Resolving...' : 'Resolve Stall 1'}
							</Text>
						</Pressable>
					</View>
				) : null}

				{stall2Active && !stall2Resolved ? (
					<View style={styles.resolveWrap}>
						<Pressable
							style={[styles.resolveButton, isResolving ? styles.resolveButtonDisabled : null]}
							onPress={handleResolveStall2}
							disabled={isResolving}
						>
							<Text style={styles.resolveButtonText}>
								{isResolving ? 'Resolving...' : 'Resolve Stall 2'}
							</Text>
						</Pressable>
					</View>
				) : null}

				<View style={styles.alertHeaderRow}>
					<Text style={styles.alertHeader}>Alert History</Text>
					<View style={styles.countBadge}>
						<Text style={styles.countText}>{alerts.length}</Text>
					</View>
				</View>

				<View style={styles.alertListContainer}>
					<FlatList
						data={alerts}
						keyExtractor={(item, index) => `${item.id ?? index}-${item.triggered_at}`}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.alertListContent}
						renderItem={({ item }) => (
							<AlertCard
								status={item.status}
								stall={item.stall}
								resolved={item.resolved}
								resolvedAt={item.resolved_at}
								triggeredAt={item.triggered_at}
								message={item.message}
							/>
						)}
						ListEmptyComponent={
							<View style={styles.emptyWrap}>
								{sensorStatus.is_online ? (
									<Text style={styles.emptyText}>No alerts recorded yet</Text>
								) : (
									<>
										<ActivityIndicator size="small" color={colors.textSecondary} />
										<Text style={[styles.emptyText, styles.emptyTextWithSpinner]}>
											Waiting for connection...
										</Text>
									</>
								)}
							</View>
						}
					/>
				</View>
			</View>
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
			paddingTop: 8,
			paddingBottom: 24,
		},
		loaderWrap: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
		},
		topRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
		},
		titleRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
		},
		settingsButton: {
			width: 36,
			height: 36,
			borderRadius: 10,
			borderWidth: 1,
			alignItems: 'center',
			justifyContent: 'center',
			borderColor: colors.border,
			backgroundColor: colors.card,
		},
		title: {
			fontSize: 28,
			fontWeight: '800',
			color: colors.textPrimary,
		},
		subtitle: {
			marginTop: 2,
			fontSize: 14,
			fontWeight: '500',
			color: colors.textSecondary,
		},
		cardGap: {
			marginTop: 12,
		},
		resolveWrap: {
			marginTop: 10,
			alignItems: 'center',
		},
		resolveButton: {
			borderWidth: 1,
			borderRadius: 10,
			paddingHorizontal: 16,
			paddingVertical: 8,
			backgroundColor: colors.accentFire,
			borderColor: colors.accentFire,
		},
		resolveButtonDisabled: {
			opacity: 0.45,
		},
		resolveButtonText: {
			color: '#FFFFFF',
			fontSize: 15,
			fontWeight: '600',
		},
		alertHeaderRow: {
			marginTop: 18,
			marginBottom: 8,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
		},
		alertHeader: {
			fontSize: 18,
			fontWeight: '700',
			color: colors.textPrimary,
		},
		countBadge: {
			minWidth: 30,
			borderWidth: 1,
			borderRadius: 999,
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderColor: colors.border,
			backgroundColor: colors.card,
		},
		countText: {
			fontSize: 13,
			fontWeight: '700',
			color: colors.textSecondary,
		},
		alertListContainer: {
			maxHeight: 320,
		},
		alertListContent: {
			paddingBottom: 12,
		},
		emptyWrap: {
			paddingVertical: 36,
			alignItems: 'center',
			justifyContent: 'center',
		},
		emptyText: {
			fontSize: 14,
			fontWeight: '500',
			color: colors.textSecondary,
		},
		emptyTextWithSpinner: {
			marginTop: 8,
		},
	});

export default DashboardScreen;
