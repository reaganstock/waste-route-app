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
      <Stack.Screen name="complete" />
      <Stack.Screen name="details" />
      <Stack.Screen name="completed" />
    </Stack>
  );
} 
 
 
 