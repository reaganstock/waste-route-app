import { Stack } from 'expo-router';

export default function RouteLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/complete" />
      <Stack.Screen name="[id]/details" />
      <Stack.Screen name="completed" />
    </Stack>
  );
} 
 
 
 