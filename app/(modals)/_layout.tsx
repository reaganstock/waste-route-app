import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="support" />
      <Stack.Screen name="updates" />
      <Stack.Screen name="profile-details" />
    </Stack>
  );
} 
 
 
 