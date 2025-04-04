import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AllRoutesScreen from '../src/screens/AllRoutesScreen';

export default function AllRoutes() {
  const params = useLocalSearchParams();
  const filter = params.filter || 'all';
  
  return (
    <View style={styles.container}>
      <AllRoutesScreen initialFilter={filter} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
