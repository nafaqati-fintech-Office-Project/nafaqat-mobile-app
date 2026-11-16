import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extends app.json. The only thing that changes is what must differ between a developer build and a build for a client:
// set APP_VARIANT=production (the "production" and "production-store" profiles in eas.json do) and the build
//   - refuses to start unless it knows the server address (EXPO_PUBLIC_API_BASE_URL, https),
//   - turns off plain-http traffic (developer builds keep it on for a backend on the local network),
//   - never uses the demo (auth bypass) mode.
const production = process.env.APP_VARIANT === 'production';

function requireProductionServer(): void {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
  if (!url.startsWith('https://')) {
    throw new Error(
      'A production build needs EXPO_PUBLIC_API_BASE_URL set to the https address of the backend ' +
        '(for example: eas env:create --environment production --name EXPO_PUBLIC_API_BASE_URL --value https://api.example.com). ' +
        `Found: "${url}"`,
    );
  }
  if (process.env.EXPO_PUBLIC_AUTH_BYPASS === 'true') {
    throw new Error('A production build must not enable EXPO_PUBLIC_AUTH_BYPASS (demo mode).');
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  if (production) requireProductionServer();

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
      const options = (plugin[1] ?? {}) as { android?: Record<string, unknown> };
      return ['expo-build-properties', { ...options, android: { ...options.android, usesCleartextTraffic: !production } }];
    }
    return plugin;
  });

  // Push notifications on Android need the client's Firebase file (google-services.json). It is supplied at build time
  // as an EAS file variable named GOOGLE_SERVICES_JSON; without it the app builds and works, but gets no push messages.
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile;

  return {
    ...config,
    name: config.name ?? 'Nafaqati',
    slug: config.slug ?? 'nafaqati-mobile',
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    plugins,
  } as ExpoConfig;
};
