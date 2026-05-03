import axios from 'axios';
import Constants from 'expo-constants';

export type FireStatus = 'fire' | 'normal';
export type StallType = 'stall_1' | 'stall_2' | 'both';

export interface FireAlertItem {
	id?: number;
	status: FireStatus;
	stall: StallType;
	resolved: boolean;
	resolved_at?: string | null;
	triggered_at: string;
	message: string;
}

export interface LatestStatusResponse {
	id?: number | null;
	status: FireStatus;
	stall: StallType | null;
	resolved: boolean;
	resolved_at?: string | null;
	triggered_at?: string;
	message?: string;
}

const getBaseUrl = async (): Promise<string> => {
	const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
	const appConfigApiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? undefined;
	const baseUrl = (envApiUrl || appConfigApiUrl || '').trim();

	if (!baseUrl) {
		throw new Error('No API URL configured. Set EXPO_PUBLIC_API_URL in your environment.');
	}

	return baseUrl.replace(/\/$/, '');
};

export const registerToken = async (
	token: string,
	channelId: string = 'default'
): Promise<void> => {
	const baseUrl = await getBaseUrl();
	await axios.post(`${baseUrl}/api/register-token/`, {
		token,
		channel_id: channelId,
	});
};

export const getLatestStatus = async (): Promise<LatestStatusResponse> => {
	const baseUrl = await getBaseUrl();
	const response = await axios.get<LatestStatusResponse>(
		`${baseUrl}/api/latest-status/`
	);
	return response.data;
};

export const getAlertHistory = async (): Promise<FireAlertItem[]> => {
	const baseUrl = await getBaseUrl();
	const response = await axios.get<FireAlertItem[]>(`${baseUrl}/api/alerts/`);
	return response.data;
};

export const resolveAlert = async (id: number): Promise<void> => {
	const baseUrl = await getBaseUrl();
	await axios.post(`${baseUrl}/api/alerts/${id}/resolve/`);
};

export interface SensorStatusResponse {
    is_online: boolean;
    last_seen: string;
}

export const getSensorStatus = async (): Promise<SensorStatusResponse> => {
	const baseUrl = await getBaseUrl();
    const response = await axios.get<SensorStatusResponse>(
		`${baseUrl}/api/sensor-status/`
    );
    return response.data;
};