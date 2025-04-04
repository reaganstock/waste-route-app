import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import LoginScreen from '../../src/screens/LoginScreen.js';

export default function Auth() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          headerShown: false,
          title: 'Login',
        }}
      />
      <LoginScreen />
    </View>
  );
} 