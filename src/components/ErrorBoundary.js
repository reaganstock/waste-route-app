import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      deviceInfo: this.getDeviceInfo()
    };
  }

  getDeviceInfo() {
    return {
      os: Platform.OS,
      osVersion: Platform.Version,
      isIOS: Platform.OS === 'ios',
      isAndroid: Platform.OS === 'android',
      model: Platform.constants?.model || 'Unknown'
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log detailed error for debugging
    console.log('Error details:', {
      message: error.message,
      stack: error.stack,
      deviceInfo: this.state.deviceInfo
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Perform additional cleanup if needed
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // If running on iOS 17.4+ or a newer version, handle differently
      const isNeweriOS = Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 17.4;
      
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorMessage}>
                {this.state.error?.message || 'An unexpected error occurred.'}
              </Text>
              {isNeweriOS && (
                <Text style={styles.compatibilityNote}>
                  This may be due to iOS compatibility. Please ensure your app is up to date.
                </Text>
              )}
              <TouchableOpacity style={styles.button} onPress={this.resetError}>
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 16,
  },
  compatibilityNote: {
    fontSize: 14,
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary; 