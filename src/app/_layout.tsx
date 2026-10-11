// The root of the app. It decides which screens you're allowed to see:
//   signed out                -> sign-in
//   signed in, no profile yet -> profile-setup
//   signed in with a profile  -> the main tabs
// Stack.Protected hides screens whose `guard` is false and moves you to one you can see.

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

// Keep the splash screen up until we know whether someone is signed in.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  const signedIn = session !== null;
  const hasProfile = profile !== null;

  return (
    <ThemeProvider
      value={{
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          headerTitleStyle: { fontFamily: FontFamily, fontWeight: '600' },
          headerBackTitleStyle: { fontFamily: FontFamily },
        }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !hasProfile}>
          <Stack.Screen name="profile-setup" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && hasProfile}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="trip/[id]" options={{ headerShown: true, title: 'Trip details', headerBackTitle: 'Back' }} />
          <Stack.Screen name="edit-trip/[id]" options={{ headerShown: true, title: 'Edit trip', presentation: 'modal' }} />
          <Stack.Screen name="request-seat/[id]" options={{ headerShown: true, title: 'Request a seat', presentation: 'modal' }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Group chat', headerBackTitle: 'Trip' }} />
          <Stack.Screen name="review/[id]" options={{ headerShown: true, title: 'Rate your trip', presentation: 'modal' }} />
          <Stack.Screen name="report/[id]" options={{ headerShown: true, title: 'Report', presentation: 'modal' }} />
          <Stack.Screen name="blocked" options={{ headerShown: true, title: 'Blocked people', headerBackTitle: 'Profile' }} />
          <Stack.Screen
            name="edit-profile"
            options={{ headerShown: true, title: 'Edit profile', presentation: 'modal' }}
          />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
