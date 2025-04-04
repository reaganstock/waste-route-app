import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { Alert, View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import RouteScreen from './src/screens/RouteScreen';
import TeamScreen from './src/screens/TeamScreen';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Ignore specific warnings if needed for production
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'Non-serializable values were found in the navigation state',
]);

// Keep splash screen visible while we check for updates
SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Main tab navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Team') {
            iconName = focused ? 'people' : 'people-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: 'rgba(255,255,255,0.1)',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -4,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
    </Tab.Navigator>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    console.error('App Error:', error);
    console.error('Error Info:', errorInfo);
    
    // Save error info for display
    this.setState({ errorInfo });
    
    // In production, you would send this to your error monitoring service
    // Example: Sentry.captureException(error);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Force app reload if possible
    if (Updates.canReloadAsync) {
      Updates.reloadAsync().catch(e => {
        console.log('Failed to reload app, trying to continue:', e);
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';
      const errorStack = this.state.error?.stack || '';
      
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <Text style={styles.errorInstructions}>
              Please try restarting the app. If the problem persists, contact support.
            </Text>
            
            <TouchableOpacity style={styles.resetButton} onPress={this.resetError}>
              <Text style={styles.resetButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Register for push notifications
async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      console.log('Push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for push notifications');
  }

  return token;
}

// Global error handling to prevent iOS 18.4 crashes
if (Platform.OS === 'ios') {
  // Patch the global error handler to prevent unhandled promise rejections from crashing the app
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('Unhandled promise rejection') || 
         args[0].includes('ExceptionsManager'))) {
      // Log the error but prevent it from crashing the app
      console.log('Suppressed error for stability:', ...args);
    } else {
      originalConsoleError(...args);
    }
  };

  // Set up global rejection handler
  const globalHandler = (event) => {
    event.preventDefault();
    console.log('Prevented app crash from unhandled rejection:', event.reason);
  };

  // Add the handler only once
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', globalHandler);
  }
}

// Request tracking permission on iOS 14.5+
const requestTrackingPermission = async () => {
  if (Platform.OS === 'ios') {
    try {
      // Use the native module conditionally
      const { ATTrackingManager } = require('react-native-tracking-transparency');
      
      // Check if the device supports tracking permission requests
      if (ATTrackingManager && ATTrackingManager.requestTrackingPermission) {
        const status = await ATTrackingManager.requestTrackingPermission();
        console.log('Tracking permission status:', status);
        return status;
      } else {
        console.log('Tracking permission API not available');
      }
    } catch (error) {
      console.log('Error requesting tracking permission:', error);
    }
  }
  return null;
};

// Main app component
const App = () => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [notification, setNotification] = useState(false);
  const notificationListener = React.useRef();
  const responseListener = React.useRef();

  useEffect(() => {
    // Set a safety timeout to prevent hanging at splash screen
    const splashTimeout = setTimeout(() => {
      if (!appIsReady) {
        console.log('Safety timeout triggered - showing app anyway');
        setAppIsReady(true);
        SplashScreen.hideAsync().catch(e => console.log('Error hiding splash:', e));
      }
    }, 5000); // 5 second timeout

    async function prepareApp() {
      try {
        // Request tracking permission on iOS
        if (Platform.OS === 'ios') {
          await requestTrackingPermission();
        }
        
        // Check for updates
        if (process.env.NODE_ENV === 'production') {
          try {
            const { isAvailable } = await Updates.checkForUpdateAsync();
            
            if (isAvailable) {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            }
          } catch (updateError) {
            console.warn('Update check failed:', updateError);
            // Continue app initialization even if update check fails
          }
        }
        
        // Register for notifications - wrap in try/catch to prevent crash
        try {
          await registerForPushNotificationsAsync();
        } catch (notifError) {
          console.warn('Notification registration failed:', notifError);
          // Continue even if notification registration fails
        }
        
      } catch (e) {
        console.warn('Error preparing app:', e);
      } finally {
        // App is initialized
        clearTimeout(splashTimeout); // Clear safety timeout
        setAppIsReady(true);
        await SplashScreen.hideAsync().catch(e => console.log('Error hiding splash:', e));
      }
    }

    prepareApp();

    // Set up notification listeners with error handling
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
        setNotification(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);
        // Handle notification response (navigate to specific screen, etc.)
      });
    } catch (notifError) {
      console.warn('Error setting up notification listeners:', notifError);
    }

    // Setup error handlers
    const handleError = (error) => {
      console.error('Unhandled error:', error);
      // In production, you would send this to your error monitoring service
    };

    // Global error handling
    const unhandledRejectionHandler = (event) => {
      handleError(event.reason);
    };

    // Set up error handlers
    if (global.addEventListener) {
      global.addEventListener('unhandledrejection', unhandledRejectionHandler);
    }

    return () => {
      // Clean up notification listeners
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      
      // Clean up error handlers
      if (global.removeEventListener) {
        global.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      }
    };
  }, []);

  if (!appIsReady) {
    return null; // Still showing splash screen
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000' },
            }}
          >
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Route" component={RouteScreen} />
            {/* Add other screens here */}
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorInstructions: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default App; 