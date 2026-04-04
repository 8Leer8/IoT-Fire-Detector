import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { registerToken } from '@/api/fireApi';
import {
	DEFAULT_NOTIFICATION_CHANNEL_ID,
	getNotificationChannelIdForRingtone,
	RINGTONE_STORAGE_KEY,
	RINGTONES,
} from '@/hooks/useRingtone';

const usePushNotification = (): string | null => {
	const [token, setToken] = useState<string | null>(null);

	useEffect(() => {
		const setupNotifications = async () => {
			try {
				// Expo Go does not support Android remote push notifications for SDK 53+.
				if (Constants.appOwnership === 'expo') {
					return;
				}

				const Notifications = await import('expo-notifications');

				const { status: existingStatus } =
					await Notifications.getPermissionsAsync();

				let finalStatus = existingStatus;
				if (existingStatus !== 'granted') {
					const { status } = await Notifications.requestPermissionsAsync();
					finalStatus = status;
				}

				if (finalStatus !== 'granted') {
					return;
				}

				const projectId =
					Constants.expoConfig?.extra?.eas?.projectId ??
					Constants.easConfig?.projectId;

				if (!projectId) {
					return;
				}

				if (Platform.OS === 'android') {
					const alertVibrationPattern = [0, 500, 250, 500, 250, 700];

					await Notifications.setNotificationChannelAsync('default', {
						name: 'default',
						importance: Notifications.AndroidImportance.MAX,
						vibrationPattern: alertVibrationPattern,
						lightColor: '#FF453A',
						sound: 'default',
					});

					for (const ringtone of RINGTONES) {
						await Notifications.setNotificationChannelAsync(ringtone.id, {
							name: ringtone.label,
							importance: Notifications.AndroidImportance.MAX,
							vibrationPattern: alertVibrationPattern,
							lightColor: '#FF453A',
							sound: ringtone.filename,
						});
					}
				}

				const storedRingtoneId = await AsyncStorage.getItem(RINGTONE_STORAGE_KEY);
				const selectedChannelId = storedRingtoneId
					? getNotificationChannelIdForRingtone(storedRingtoneId)
					: DEFAULT_NOTIFICATION_CHANNEL_ID;

				const expoToken =
					(await Notifications.getExpoPushTokenAsync({ projectId })).data;
				setToken(expoToken);
				await registerToken(expoToken, selectedChannelId);
			} catch (error) {
				console.warn('Push notification setup skipped:', error);
			}
		};

		void setupNotifications();
	}, []);

	return token;
};

export default usePushNotification;
