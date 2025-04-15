import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LoadingScreen = () => {
  // Animation for pulsing effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Start pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <Animated.View
        style={[
          styles.logoContainer,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
      
      <Text style={styles.title}>WasteRoute</Text>
      <Text style={styles.subtitle}>Efficient Route Management</Text>
      
      <ActivityIndicator 
        size="large" 
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
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#9CA3AF',
    marginBottom: 40,
  },
  loadingIndicator: {
    marginTop: 20,
  },
});

export default LoadingScreen; 