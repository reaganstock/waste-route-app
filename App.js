import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
// This imports the Expo Router entry point
import { RootSiblingParent } from 'react-native-root-siblings';
import { registerRootComponent } from 'expo';
import App from './node_modules/expo-router/entry';

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

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  console.log('SplashScreen already hidden');
});

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

// Main app wrapper component with instant startup
const AppWrapper = () => {
  const notificationListener = React.useRef();
  const responseListener = React.useRef();

  useEffect(() => {
    // Hide the Expo splash screen immediately
    SplashScreen.hideAsync().catch(e => console.log('Error hiding splash:', e));
    
    // Run initialization in the background without blocking UI
    async function prepareAppInBackground() {
      try {
        // Check for updates in background
        if (process.env.NODE_ENV === 'production') {
          try {
            const { isAvailable } = await Updates.checkForUpdateAsync();
            
            if (isAvailable) {
              await Updates.fetchUpdateAsync();
              // Don't reload automatically - will apply on next app launch
            }
          } catch (updateError) {
            console.warn('Update check failed:', updateError);
          }
        }
        
        // Register for notifications in background
        try {
          await registerForPushNotificationsAsync();
        } catch (notifError) {
          console.warn('Notification registration failed:', notifError);
        }
      } catch (e) {
        console.warn('Error in background initialization:', e);
      }
    }

    prepareAppInBackground();

    // Set up notification listeners with error handling
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);
        // Handle notification response (navigate to specific screen, etc.)
      });
    } catch (notifError) {
      console.warn('Error setting up notification listeners:', notifError);
    }

    return () => {
      // Clean up notification listeners
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Render the app immediately with no loading screen
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootSiblingParent>
        <App />
      </RootSiblingParent>
    </SafeAreaProvider>
  );
};

export default registerRootComponent(AppWrapper); 