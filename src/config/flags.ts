// TEMP: remove when dashboard is connected to backend (AUTH_BYPASS).
export const AUTH_BYPASS: boolean = process.env.EXPO_PUBLIC_AUTH_BYPASS !== 'false';

// The bank SMS reader entry and its screens: on for everyone. Set EXPO_PUBLIC_SMS_TOOLS=false to hide them
// (READ_SMS is a restricted permission, so a Play Store release needs a Play Console declaration first).
export const SMS_TOOLS_ENABLED: boolean = process.env.EXPO_PUBLIC_SMS_TOOLS !== 'false';

export const DASHBOARD_MOCK_FAIL: boolean = process.env.EXPO_PUBLIC_DASHBOARD_MOCK_FAIL === 'true';
