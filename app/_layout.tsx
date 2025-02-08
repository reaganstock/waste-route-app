import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="route/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="route-create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="map" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="signup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="forgot-password" options={{ presentation: 'modal' }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
