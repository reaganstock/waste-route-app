import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance } from 'geolib';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

// Sound URLs from Supabase - hardcoded URLs for reliability
const SOUND_URLS = {
  COLLECT: 'https://ppumccuvuckqrozhygew.supabase.co/storage/v1/object/sign/audio/11L-persistent_collect_s-1744674206365.mp3?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJhdWRpby8xMUwtcGVyc2lzdGVudF9jb2xsZWN0X3MtMTc0NDY3NDIwNjM2NS5tcDMiLCJpYXQiOjE3NDQ2NzQyMzMsImV4cCI6MTc3NjIxMDIzM30.ahZhzmmCRU_84v3jVBVKo4WUVPnyPgs0TnIuXsfGFKQ',
  SKIP: 'https://ppumccuvuckqrozhygew.supabase.co/storage/v1/object/sign/audio/11L-2._Skip_Notification-1744664804277.mp3?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJhdWRpby8xMUwtMi5fU2tpcF9Ob3RpZmljYXRpb24tMTc0NDY2NDgwNDI3Ny5tcDMiLCJpYXQiOjE3NDQ2NzMzOTAsImV4cCI6MTc3NjIwOTM5MH0.AthBAnV2Z3I4yLxpb6ERQkrOK037Xu1TzTT24dJTSsg',
  NEW_CUSTOMER: 'https://ppumccuvuckqrozhygew.supabase.co/storage/v1/object/sign/audio/11L-3._New_Customer_Noti-1744664868116.mp3?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJhdWRpby8xMUwtMy5fTmV3X0N1c3RvbWVyX05vdGktMTc0NDY2NDg2ODExNi5tcDMiLCJpYXQiOjE3NDQ2NzM0MDMsImV4cCI6MTc3NjIwOTQwM30.36EHR9eio54dwbkpePPLxzw_dzTEftBYtLcBSFLYm4s'
};

// Notification action categories
const NOTIFICATION_CATEGORIES = {
  ROUTE_ALERT: 'route-alert'
};

// Default settings for geofencing
const DEFAULT_SETTINGS = {
  ALERT_DISTANCE: 50, // meters - notification alert distance
  MIN_DISTANCE_CHANGE: 10, // meters - minimum movement to trigger check
  NOTIFICATION_COOLDOWN: 2 * 60 * 1000, // 2 minutes between repeat notifications
  BACKGROUND_UPDATE_INTERVAL: 20 * 1000, // 20 seconds in background
  FOREGROUND_UPDATE_INTERVAL: 5 * 1000, // 5 seconds in foreground
  LOCATION_ACCURACY: Location.Accuracy.High, // Increased accuracy
  // Sound settings
  SOUNDS: {
    COLLECT: 'collect_sound', // Sound for regular collection
    SKIP: 'skip_sound', // Sound for skip houses
    NEW_CUSTOMER: 'new_customer_sound' // Sound for new customers
  }
};

// Set up notification categories for acknowledgment
const setupNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.ROUTE_ALERT, [
    {
      identifier: 'acknowledge',
      buttonTitle: 'Acknowledge',
      options: {
        isDestructive: false,
        isAuthenticationRequired: false,
        opensAppToForeground: true
      }
    },
    {
      identifier: 'navigate',
      buttonTitle: 'Navigate',
      options: {
        isDestructive: false,
        isAuthenticationRequired: false,
        opensAppToForeground: true
      }
    }
  ]);
};

// Function to play sound from URL
const playSoundFromURL = async (soundType) => {
  try {
    let soundURL;
    
    console.log(`Attempting to play sound: ${soundType}`);
    
    switch(soundType) {
      case 'skip_sound':
        soundURL = SOUND_URLS.SKIP;
        console.log('Playing SKIP sound');
        break;
      case 'new_customer_sound':
        soundURL = SOUND_URLS.NEW_CUSTOMER;
        console.log('Playing NEW_CUSTOMER sound');
        break;
      case 'collect_sound':
        soundURL = SOUND_URLS.COLLECT;
        console.log('Playing COLLECT sound');
        break;
      default:
        console.log(`Unknown sound type: ${soundType}, using COLLECT as default`);
        soundURL = SOUND_URLS.COLLECT;
    }
    
    if (!soundURL) {
      console.error(`No URL found for sound type: ${soundType}`);
      return null;
    }
    
    console.log(`Loading sound from URL: ${soundURL.substring(0, 50)}...`);
    
    // Set up audio mode for best compatibility
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    
    const soundObject = new Audio.Sound();
    await soundObject.loadAsync({ uri: soundURL });
    
    // Set volume to maximum
    await soundObject.setVolumeAsync(1.0);
    
    await soundObject.playAsync();
    
    // Unload sound when finished
    soundObject.setOnPlaybackStatusUpdate(status => {
      if (status.didJustFinish) {
        soundObject.unloadAsync().catch(err => {
          console.error("Error unloading sound:", err);
        });
      }
    });
    
    return soundObject;
  } catch (error) {
    console.error('Error playing sound:', error);
    return null;
  }
};

export const useGeofencing = (houses, enabled = false) => {
  const [nearbyHouses, setNearbyHouses] = useState([]);
  const [approachingHouses, setApproachingHouses] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [geofenceSettings, setGeofenceSettings] = useState(DEFAULT_SETTINGS);
  const [isNotifying, setIsNotifying] = useState(false); // Track if notification is in progress
  
  // Performance optimizations with refs
  const lastNotifications = useRef(new Map());
  const locationSubscription = useRef(null);
  const lastLocation = useRef(null);
  const appState = useRef(AppState.currentState);
  const housesRef = useRef(houses);
  const enabledRef = useRef(enabled);
  const settingsRef = useRef(geofenceSettings);
  const notificationQueue = useRef([]);
  
  // Set up notification categories
  useEffect(() => {
    setupNotificationCategories();
  }, []);
  
  // Load geofence settings from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('geofenceSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          // Merge with defaults to ensure all properties exist
          const mergedSettings = {
            ...DEFAULT_SETTINGS,
            ...parsedSettings
          };
          setGeofenceSettings(mergedSettings);
          settingsRef.current = mergedSettings;
        }
      } catch (error) {
        console.error('Error loading geofence settings:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // Update refs when props change
  useEffect(() => {
    housesRef.current = houses;
    enabledRef.current = enabled;
    settingsRef.current = geofenceSettings;
  }, [houses, enabled, geofenceSettings]);

  // Function to save geofence settings
  const saveGeofenceSettings = useCallback(async (newSettings) => {
    try {
      const mergedSettings = {
        ...settingsRef.current,
        ...newSettings
      };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('geofenceSettings', JSON.stringify(mergedSettings));
      
      // Update state and ref
      setGeofenceSettings(mergedSettings);
      settingsRef.current = mergedSettings;
      
      return true;
    } catch (error) {
      console.error('Error saving geofence settings:', error);
      return false;
    }
  }, []);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    // Use haversine formula for better performance over long distances
    return getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
  }, []);

  const shouldNotify = useCallback((houseId, notificationType) => {
    const key = `${houseId}-${notificationType}`;
    const lastNotification = lastNotifications.current.get(key);
    const now = Date.now();
    return !lastNotification || (now - lastNotification) > settingsRef.current.NOTIFICATION_COOLDOWN;
  }, []);

  // Process notification queue one at a time
  const processNotificationQueue = useCallback(async () => {
    if (notificationQueue.current.length === 0 || isNotifying) return;
    
    setIsNotifying(true);
    try {
      // Get the next house from the queue
      const { house, distance } = notificationQueue.current.shift();
      
      // Get the status of the house - normalize to lowercase and handle different formats
      const status = house.status?.toLowerCase() || 'collect';
      const isSkip = status === 'skip' || status === 'skipped';
      const isNewCustomer = status === 'new customer' || status === 'new';
      const isCollect = !isSkip && !isNewCustomer;
      
      // Get color based on status
      const statusColor = isSkip ? 
        '#EF4444' :  // Red for skip 
        isNewCustomer ? 
          '#10B981' :  // Green for new customer
          '#6B7280';   // Grey for regular collection
      
      // Customize notification based on house status
      const title = isSkip ? 
        '⚠️ SKIP HOUSE' : 
        isNewCustomer ? 
          '🆕 NEW CUSTOMER' : 
          '🏠 Regular Collection';
           
      const body = `Alert: ${house.address}
${Math.round(distance)}m away${house.notes ? `\nNote: ${house.notes}` : ''}`;

      try {
        // Set up audio mode for best compatibility
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
        
        // Choose the correct sound URL based on status
        let soundURL;
        if (isSkip) {
          soundURL = SOUND_URLS.SKIP;
          console.log('Playing SKIP sound');
        } else if (isNewCustomer) {
          soundURL = SOUND_URLS.NEW_CUSTOMER;
          console.log('Playing NEW_CUSTOMER sound');
        } else {
          soundURL = SOUND_URLS.COLLECT;
          console.log('Playing COLLECT sound');
        }
        
        console.log(`Loading sound from URL: ${soundURL.substring(0, 50)}...`);
        
        // Create and load the sound
        const soundObject = new Audio.Sound();
        await soundObject.loadAsync({ uri: soundURL });
        
        // Set volume to maximum
        await soundObject.setVolumeAsync(1.0);
        
        // Play the sound
        await soundObject.playAsync();
        
        // Ensure sound gets unloaded when finished
        soundObject.setOnPlaybackStatusUpdate(status => {
          if (status.didJustFinish) {
            soundObject.unloadAsync().catch(err => {
              console.error("Error unloading sound:", err);
            });
          }
        });
        
        // Wait a moment to ensure the sound has started playing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Sound playback started successfully');
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }

      // Schedule the notification with sound disabled (we're playing it manually)
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { 
            houseId: house.id, 
            status: house.status,
            houseStatus: house.status || 'collect', // Explicitly include house status for sound
            distance,
            address: house.address,
            statusColor,
            lat: house.lat,
            lng: house.lng
          },
          categoryIdentifier: NOTIFICATION_CATEGORIES.ROUTE_ALERT,
          sound: false, // Disable the default sound since we play our custom sound manually
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: true, // Vibrate for all notifications
          sticky: true, // Makes the notification not auto-dismissable on Android
          autoDismiss: false // Prevents auto-dismiss when tapped
        },
        trigger: null, // Send immediately
      });

      // Record notification time to prevent spam
      const key = `${house.id}-alert`;
      lastNotifications.current.set(key, Date.now());
      
      // Process the next notification after a delay
      setTimeout(() => {
        setIsNotifying(false);
        processNotificationQueue();
      }, 2500); // Wait 2.5 seconds between notifications for sound to finish
      
    } catch (error) {
      console.error('Error processing notification queue:', error);
      setError('Failed to show notification');
      setIsNotifying(false);
      // Try to continue with the next notification
      setTimeout(processNotificationQueue, 1000);
    }
  }, []);
  
  // Effect to start processing the queue when items are added
  useEffect(() => {
    processNotificationQueue();
  }, [processNotificationQueue]);

  const showNotification = useCallback(async (house, distance) => {
    // Determine house status
    const status = house.status?.toLowerCase() || 'collect';
    
    // Use only alert distance now
    if (!shouldNotify(house.id, 'alert')) return;
    
    try {
      // Add to notification queue with proper house status
      notificationQueue.current.push({ 
        house, 
        distance,
        houseStatus: house.status || 'collect'
      });
      
      // Start processing the queue if not already running
      if (!isNotifying) {
        processNotificationQueue();
      }
    } catch (error) {
      console.error('Error queueing notification:', error);
      setError('Failed to queue notification');
    }
  }, [shouldNotify, isNotifying, processNotificationQueue]);

  const checkNearbyHouses = useCallback(async (location) => {
    // Get current houses from ref for performance
    const currentHouses = housesRef.current;
    const isEnabled = enabledRef.current;
    
    if (!currentHouses || !isEnabled) return;
    
    // Skip if location hasn't changed significantly
    if (lastLocation.current) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        lastLocation.current.latitude,
        lastLocation.current.longitude
      );
      
      if (distance < settingsRef.current.MIN_DISTANCE_CHANGE) {
        return;
      }
    }
    
    // Update last location
    lastLocation.current = location;

    try {
      const alertHouses = [];

      // Use for loop instead of forEach for better performance
      for (let i = 0; i < currentHouses.length; i++) {
        const house = currentHouses[i];
        if (!house.lat || !house.lng) continue;

        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          parseFloat(house.lat),
          parseFloat(house.lng)
        );

        // Only track houses within alert distance
        if (distance <= settingsRef.current.ALERT_DISTANCE) {
          const houseWithDistance = { ...house, distance };
          alertHouses.push(houseWithDistance);
        }
      }

      // Sort by distance
      alertHouses.sort((a, b) => a.distance - b.distance);

      // Find newly detected houses - optimize comparison with Set
      const currentAlertIds = new Set(nearbyHouses.map(h => h.id));
      
      const newAlertHouses = alertHouses.filter(house => !currentAlertIds.has(house.id));

      // Batch notifications for better performance
      const notificationPromises = [];
      
      // Show notifications for new nearby houses
      for (const house of newAlertHouses) {
        notificationPromises.push(showNotification(house, house.distance));
      }
      
      // Process all notifications in parallel
      await Promise.all(notificationPromises);

      setNearbyHouses(alertHouses);
      setApproachingHouses([]); // No longer using approaching houses
    } catch (error) {
      console.error('Error checking nearby houses:', error);
      setError('Failed to check nearby houses');
    }
  }, [nearbyHouses, calculateDistance, showNotification]);

  // Start/stop tracking based on enabled and app state
  const startTracking = useCallback(async () => {
    if (isTracking || !enabledRef.current) return;

    try {
      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('LOCATION_PERMISSION_DENIED');
      }
      
      // Try to get background permission for better tracking
      let backgroundPermission = false;
      
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        backgroundPermission = backgroundStatus === 'granted';
      } catch (err) {
        console.warn('Background location permission not available:', err);
        // Continue without background permissions
      }
      
      // Configure for background operation
      await Location.enableNetworkProviderAsync().catch(err => {
        console.warn('Error enabling network provider:', err);
      });
      
      // Clear any existing subscription
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      
      // Set up location tracking - use accuracy based on platform and state
      const currentState = AppState.currentState;
      const isForeground = currentState === 'active';
      
      const locationOptions = {
        accuracy: backgroundPermission 
          ? Location.Accuracy.Balanced  // Lower accuracy in background to save battery
          : Location.Accuracy.High,     // Higher accuracy in foreground
        distanceInterval: settingsRef.current.MIN_DISTANCE_CHANGE,
        timeInterval: isForeground 
          ? settingsRef.current.FOREGROUND_UPDATE_INTERVAL 
          : settingsRef.current.BACKGROUND_UPDATE_INTERVAL,
        foregroundService: {
          notificationTitle: "WasteRoute Active",
          notificationBody: "Route tracking is active",
          notificationColor: "#3B82F6",
        },
        pausesUpdatesAutomatically: false,
        // These options help with background operation
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true,
      };
      
      console.log('Starting location tracking with options:', JSON.stringify(locationOptions));
      
      locationSubscription.current = await Location.watchPositionAsync(
        locationOptions,
        (location) => {
          checkNearbyHouses(location.coords);
        }
      );
      
      setIsTracking(true);
      setError(null);
      
      console.log('Location tracking started successfully');
    } catch (error) {
      console.error('Error starting tracking:', error);
      setError(`Failed to start tracking: ${error.message}`);
      setIsTracking(false);
    }
  }, [isTracking, checkNearbyHouses]);

  const stopTracking = useCallback(async () => {
    if (!isTracking) return;

    try {
      if (locationSubscription.current) {
        await locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      setIsTracking(false);
      setNearbyHouses([]);
      setApproachingHouses([]);
      setError(null);
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      setError('Failed to stop tracking');
    }
  }, [isTracking]);

  // Watch for app state changes to adjust location update frequency
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current === 'active' && 
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background - adjust tracking for battery savings
        if (locationSubscription.current) {
          stopTracking().then(() => {
            if (enabledRef.current) {
              startTracking();
            }
          });
        }
      }
      
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        // App is coming to foreground - restore normal tracking
        if (locationSubscription.current) {
          stopTracking().then(() => {
            if (enabledRef.current) {
              startTracking();
            }
          });
        }
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [stopTracking, startTracking]);

  // Start/stop tracking based on enabled prop
  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);

  return {
    nearbyHouses,
    approachingHouses,
    isTracking,
    error,
    settings: geofenceSettings,
    saveSettings: saveGeofenceSettings,
    playSound: playSoundFromURL, // Export the sound playing function
  };
}; 