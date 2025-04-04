import React from 'react';
import { View } from 'react-native';
import HomeScreen from '../../src/screens/HomeScreen';

export default function Routes() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <HomeScreen />
    </View>
  );
} 