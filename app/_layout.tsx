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
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="support" />
        <Stack.Screen name="updates" />
        <Stack.Screen name="profile-details" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="route" />
      </Stack>
    </>
  );
}
