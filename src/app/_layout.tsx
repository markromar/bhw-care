import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { resolveLanguage, setupI18n } from '@/i18n';
import { startSessionListener } from '@/lib/auth';
import { useSessionStore } from '@/state/sessionStore';
import '@/styles/tailwind.css';

SplashScreen.preventAutoHideAsync();

// Language resolution: user preference -> system default -> English.
// No user is signed in yet at startup, so only the system default applies for now.
setupI18n(resolveLanguage(null, 'en'));

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const status = useSessionStore((state) => state.status);

  useEffect(() => startSessionListener(), []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {status === 'initializing' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={status === 'signed_out'}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
          <Stack.Protected guard={status === 'signed_in'}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
      )}
    </ThemeProvider>
  );
}
