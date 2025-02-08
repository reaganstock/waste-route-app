import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000' },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="signup"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="forgot-password"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
} 