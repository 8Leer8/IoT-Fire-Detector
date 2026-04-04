import { Stack } from 'expo-router';
import { AppThemeProvider } from '@/hooks/useAppTheme';
import { useAppTheme } from '@/hooks/useAppTheme';

const getColors = (scheme: 'dark' | 'light' | null | undefined) => {
	if (scheme === 'dark') {
		return {
			background: '#0D0D0D',
			textPrimary: '#F5F5F5',
			border: '#2C2C2E',
		};
	}

	return {
		background: '#F5F5F5',
		textPrimary: '#1A1A1A',
		border: '#E0E0E0',
	};
};

const RootNavigator = () => {
	const { colorScheme } = useAppTheme();
	const colors = getColors(colorScheme);

	return (
		<Stack
			screenOptions={{
				headerStyle: {
					backgroundColor: colors.background,
				},
				headerTintColor: colors.textPrimary,
				headerTitleStyle: {
					fontWeight: '700',
				},
				headerShadowVisible: true,
				contentStyle: {
					backgroundColor: colors.background,
				},
			}}
		>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="settings"
				options={{
					title: 'Settings',
					headerStyle: { backgroundColor: colors.background },
				}}
			/>
			<Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Info' }} />
		</Stack>
	);
};

const RootLayout = () => {
	return (
		<AppThemeProvider>
			<RootNavigator />
		</AppThemeProvider>
	);
};

export default RootLayout;
