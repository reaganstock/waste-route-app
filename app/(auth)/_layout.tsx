import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          animation: 'slide_from_right',
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
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="sign-in"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
} 