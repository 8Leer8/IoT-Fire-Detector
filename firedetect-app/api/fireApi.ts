import axios from 'axios';

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

const getBaseUrl = (): string => {
	const baseUrl = process.env.EXPO_PUBLIC_API_URL;

	if (!baseUrl) {
		throw new Error('EXPO_PUBLIC_API_URL is not set.');
	}

	return baseUrl.replace(/\/$/, '');
};

export const registerToken = async (
	token: string,
	tone: string = 'default'
): Promise<void> => {
	await axios.post(`${getBaseUrl()}/api/register-token/`, { token, tone });
};

export const getLatestStatus = async (): Promise<LatestStatusResponse> => {
	const response = await axios.get<LatestStatusResponse>(
		`${getBaseUrl()}/api/latest-status/`
	);
	return response.data;
};

export const getAlertHistory = async (): Promise<FireAlertItem[]> => {
	const response = await axios.get<FireAlertItem[]>(`${getBaseUrl()}/api/alerts/`);
	return response.data;
};

export const resolveAlert = async (id: number): Promise<void> => {
	await axios.post(`${getBaseUrl()}/api/alerts/${id}/resolve/`);
};

export interface SensorStatusResponse {
    is_online: boolean;
    last_seen: string;
}

export const getSensorStatus = async (): Promise<SensorStatusResponse> => {
    const response = await axios.get<SensorStatusResponse>(
        `${getBaseUrl()}/api/sensor-status/`
    );
    return response.data;
};