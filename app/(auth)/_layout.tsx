import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="sign-in"
        options={{
          title: 'Sign In',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: 'Sign Up',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="verify"
        options={{
          title: 'Verify Email',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Forgot Password',
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
} 