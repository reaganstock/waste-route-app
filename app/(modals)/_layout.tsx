import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animation: 'none',
        gestureEnabled: false,
        contentStyle: { backgroundColor: '#000' }
      }}
    >
      <Stack.Screen name="support" />
      <Stack.Screen name="updates" />
      <Stack.Screen name="profile-details" />
      <Stack.Screen name="route-completion" />
    </Stack>
  );
} 
 
 
 
 
 