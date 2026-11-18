// Demo mode: no login, mock data. Off unless EXPO_PUBLIC_AUTH_BYPASS=true is set on purpose, so a build that forgets the
// variable can never ship with the mock session. (Production builds also refuse to build with it on, see app.config.ts.)
export const AUTH_BYPASS: boolean = process.env.EXPO_PUBLIC_AUTH_BYPASS === 'true';

// The bank SMS reader entry and its screens: on for everyone. Set EXPO_PUBLIC_SMS_TOOLS=false to hide them
// (READ_SMS is a restricted permission, so a Play Store release needs a Play Console declaration first).
export const SMS_TOOLS_ENABLED: boolean = process.env.EXPO_PUBLIC_SMS_TOOLS !== 'false';

export const DASHBOARD_MOCK_FAIL: boolean = process.env.EXPO_PUBLIC_DASHBOARD_MOCK_FAIL === 'true';

// The connection check's test SMS (iPhone). Needs the backend endpoint that texts the user's verified number; until then
// the app shows "Setup saved" and connects on the first real bank message.
export const IOS_TEST_SMS_ENABLED: boolean = process.env.EXPO_PUBLIC_IOS_TEST_SMS === 'true';
