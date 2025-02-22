import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const GeocodingProgress = ({ current, total, errors = [] }) => {
  const progress = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <BlurView intensity={80} style={styles.container}>
      <LinearGradient
        colors={['rgba(59,130,246,0.1)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.title}>Geocoding Addresses</Text>
        <Text style={styles.subtitle}>
          {current} of {total} addresses processed
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${progress}%` }
            ]} 
          />
        </View>
        {errors.length > 0 && (
          <Text style={styles.errorText}>
            {errors.length} address{errors.length !== 1 ? 'es' : ''} failed to geocode
          </Text>
        )}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  content: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#EF4444',
  },
});

export default GeocodingProgress; 