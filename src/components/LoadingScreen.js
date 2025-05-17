import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LoadingScreen = () => {
  // Ultra minimal loading screen for fast transition
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      
      <Text style={styles.title}>WasteRoute</Text>
      
      <ActivityIndicator 
        size="small" 
        color="#3B82F6"
        style={styles.loadingIndicator} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  loadingIndicator: {
    marginTop: 10,
  },
});

export default LoadingScreen; 