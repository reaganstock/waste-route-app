import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import React from 'react';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

type NavigationErrorBoundaryProps = {
  children: React.ReactNode;
};

type NavigationErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

// Error boundary specific for the root app navigation
class NavigationErrorBoundary extends React.Component<NavigationErrorBoundaryProps, NavigationErrorBoundaryState> {
  constructor(props: NavigationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): NavigationErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Navigation error:', error);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
    try {
      // Try to reload the app
      Updates.reloadAsync().catch(e => {
        console.log('Failed to reload app:', e);
      });
    } catch (e) {
      console.log('Failed to reload app:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="navigate-circle" size={64} color="#3B82F6" />
          <Text style={styles.title}>Navigation Error</Text>
          <Text style={styles.message}>
            There was a problem navigating to this screen.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  
  useEffect(() => {
    checkOnboardingStatus();
  }, []);
  
  const checkOnboardingStatus = async () => {
    try {
      // Add timeout protection to prevent infinite loading if AsyncStorage hangs
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout checking onboarding status')), 5000)
      );
      
      const statusPromise = AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      
      // Race between actual operation and timeout
      const status = await Promise.race([statusPromise, timeoutPromise]);
      setOnboardingComplete(status === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Default to showing onboarding if there's an error
      setOnboardingComplete(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2937' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }
  
  return (
    <NavigationErrorBoundary>
      {onboardingComplete ? 
        <Redirect href="/(tabs)" /> : 
        <Redirect href="/onboarding" />}
    </NavigationErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 