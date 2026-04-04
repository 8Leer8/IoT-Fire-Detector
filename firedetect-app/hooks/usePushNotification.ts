import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { registerToken } from '@/api/fireApi';

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
					await Notifications.setNotificationChannelAsync('default', {
						name: 'default',
						importance: Notifications.AndroidImportance.MAX,
						vibrationPattern: [0, 250, 250, 500],
						lightColor: '#FF453A',
						sound: 'default',
					});
				}

				const expoToken =
					(await Notifications.getExpoPushTokenAsync({ projectId })).data;
				setToken(expoToken);
				await registerToken(expoToken);
			} catch (error) {
				console.warn('Push notification setup skipped:', error);
			}
		};

		void setupNotifications();
	}, []);

	return token;
};

export default usePushNotification;
