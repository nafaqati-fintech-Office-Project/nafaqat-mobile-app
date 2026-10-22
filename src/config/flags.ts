// TEMP: remove when dashboard is connected to backend (AUTH_BYPASS).
export const AUTH_BYPASS: boolean = process.env.EXPO_PUBLIC_AUTH_BYPASS !== 'false';

export const DASHBOARD_MOCK_FAIL: boolean = process.env.EXPO_PUBLIC_DASHBOARD_MOCK_FAIL === 'true';
