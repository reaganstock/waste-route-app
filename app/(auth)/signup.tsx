import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import SignupScreen from '../../src/screens/SignupScreen';

export default function Signup() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          headerShown: false,
          title: 'Sign Up',
        }}
      />
      <SignupScreen />
    </View>
  );
} 