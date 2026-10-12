// The root of the app. It decides which screens you're allowed to see:
//   signed out                -> sign-in
//   signed in, no profile yet -> profile-setup
//   signed in with a profile  -> the main tabs
// Stack.Protected hides screens whose `guard` is false and moves you to one you can see.

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { KeyboardDoneBar } from '@/components/ui';
import { FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ThemeChoiceProvider } from '@/providers/theme-provider';

// Keep the splash screen up until we know whether someone is signed in.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    // Needed for drag gestures, like sliding the bubble on a segmented switch.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeChoiceProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeChoiceProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const scheme = useColorScheme();
  const colors = useTheme();
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
      <KeyboardDoneBar />
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
          {/* Profile sections: each slides in from the side (swipe back to return). */}
          <Stack.Screen name="me/ride-style" options={{ headerShown: true, title: 'Ride style', headerBackTitle: 'Profile' }} />
          <Stack.Screen name="me/car" options={{ headerShown: true, title: 'My car', headerBackTitle: 'Profile' }} />
          <Stack.Screen name="me/payment" options={{ headerShown: true, title: 'Payment', headerBackTitle: 'Profile' }} />
          <Stack.Screen name="me/reviews" options={{ headerShown: true, title: 'Reviews', headerBackTitle: 'Profile' }} />
          <Stack.Screen name="me/theme" options={{ headerShown: true, title: 'Theme', headerBackTitle: 'Profile' }} />
          <Stack.Screen name="me/reliability" options={{ headerShown: true, title: 'Reliability', headerBackTitle: 'Profile' }} />
          {/* Slides in from the side (swipe back to return), like Blocked people. */}
          <Stack.Screen name="edit-profile" options={{ headerShown: true, title: 'Edit profile', headerBackTitle: 'Profile' }} />
          {/* A sheet that springs up and sizes itself to its content; drag down to close. */}
          <Stack.Screen
            name="sign-out"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
            }}
          />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
