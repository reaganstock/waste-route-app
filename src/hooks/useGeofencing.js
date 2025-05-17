import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance } from 'geolib';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

const GEOFENCE_TASK_NAME = 'GEOFENCE_NOTIFICATION_TASK';
const ASYNC_STORAGE_ROUTE_DATA_PREFIX = 'geofenceRouteData_';
const ASYNC_STORAGE_NOTIFIED_HOUSES_PREFIX = 'routeNotified_';

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

// TaskManager Definition (Ideally in App.js or a dedicated tasks.js file)
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundGeofenceTask] Error:', error);
    return TaskManager.Result.failed;
  }

  const { eventType, region } = data;

  if (eventType === Location.GeofencingEventType.Enter) {
    console.log('[BackgroundGeofenceTask] Entered region:', region.identifier);
    const [routeId, houseIdStr] = region.identifier.split('_');
    const houseId = parseInt(houseIdStr, 10);

    if (!routeId || isNaN(houseId)) {
      console.error('[BackgroundGeofenceTask] Invalid region identifier:', region.identifier);
      return TaskManager.Result.failed;
    }

    try {
      const notifiedHousesKey = `${ASYNC_STORAGE_NOTIFIED_HOUSES_PREFIX}${routeId}`;
      const storedNotifiedHouses = await AsyncStorage.getItem(notifiedHousesKey);
      const notifiedHousesSet = storedNotifiedHouses ? new Set(JSON.parse(storedNotifiedHouses)) : new Set();

      if (notifiedHousesSet.has(houseId)) {
        console.log(`[BackgroundGeofenceTask] House ${houseId} for route ${routeId} already notified.`);
        return TaskManager.Result.fulfilled;
      }

      const routeDataKey = `${ASYNC_STORAGE_ROUTE_DATA_PREFIX}${routeId}`;
      const storedRouteData = await AsyncStorage.getItem(routeDataKey);
      if (!storedRouteData) {
        console.error(`[BackgroundGeofenceTask] No route data found for route ${routeId}`);
        return TaskManager.Result.failed;
      }
      
      const housesForRoute = JSON.parse(storedRouteData);
      const house = housesForRoute.find(h => h.id === houseId);

      if (!house) {
        console.error(`[BackgroundGeofenceTask] House ${houseId} not found in stored data for route ${routeId}`);
        return TaskManager.Result.failed;
      }

      const status = house.status?.toLowerCase() || 'collect';
      const isSkip = status === 'skip' || status === 'skipped';
      const isNewCustomer = status === 'new customer' || status === 'new';
      
      let soundFilename;
      if (isSkip) soundFilename = 'skip_sound.mp3';
      else if (isNewCustomer) soundFilename = 'new_customer_sound.mp3';
      else soundFilename = 'collect_sound.mp3';

      const title = isSkip ? '⚠️ SKIP HOUSE' : isNewCustomer ? '🆕 NEW CUSTOMER' : '🏠 Regular Collection';
      const body = `Alert: ${house.address}${house.notes ? `\nNote: ${house.notes}` : ''}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: soundFilename,
          data: { routeId, houseId, address: house.address, status: house.status },
          categoryIdentifier: NOTIFICATION_CATEGORIES.ROUTE_ALERT,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: true,
        },
        trigger: null, // Immediate
      });

      notifiedHousesSet.add(houseId);
      await AsyncStorage.setItem(notifiedHousesKey, JSON.stringify(Array.from(notifiedHousesSet)));
      console.log(`[BackgroundGeofenceTask] Notification scheduled for ${house.address}`);
      
      return TaskManager.Result.fulfilled;
    } catch (taskError) {
      console.error('[BackgroundGeofenceTask] Processing error:', taskError);
      return TaskManager.Result.failed;
    }
  }
  return TaskManager.Result.fulfilled; // Default for other event types
});

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

export const useGeofencing = (housesWithRouteId, enabled = false) => {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [geofenceSettings, setGeofenceSettings] = useState(DEFAULT_SETTINGS);
  
  const settingsRef = useRef(geofenceSettings);
  const housesRef = useRef(housesWithRouteId); 
  const enabledRef = useRef(enabled);
  const currentRouteIdRef = useRef(null);
  
  useEffect(() => {
    setupNotificationCategories();
    // Determine currentRouteId when housesWithRouteId changes
    if (housesWithRouteId && housesWithRouteId.length > 0 && housesWithRouteId[0].route_id) {
        currentRouteIdRef.current = housesWithRouteId[0].route_id;
    } else {
        currentRouteIdRef.current = null; // Reset if no valid route_id
    }
    housesRef.current = housesWithRouteId;
  }, [housesWithRouteId]);

  useEffect(() => {
    settingsRef.current = geofenceSettings;
  }, [geofenceSettings]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const startTracking = useCallback(async () => {
    if (isTracking || !enabledRef.current || !currentRouteIdRef.current) {
      if (!currentRouteIdRef.current) console.warn('[useGeofencing] startTracking called without a valid routeId.');
      return;
    }
    
    const routeId = currentRouteIdRef.current;

    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') throw new Error('LOCATION_FOREGROUND_PERMISSION_DENIED');
      
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') throw new Error('LOCATION_BACKGROUND_PERMISSION_DENIED');

    const currentHouses = housesRef.current;
      if (!currentHouses || currentHouses.length === 0) {
        console.log('[useGeofencing] No houses to track.');
        return;
      }

      // Store simplified house data for the background task
      const simplifiedHouses = currentHouses.map(h => ({ 
        id: h.id, 
        route_id: h.route_id, // Ensure route_id is part of house object
        address: h.address, 
        status: h.status, 
        notes: h.notes,
        lat: parseFloat(h.lat),
        lng: parseFloat(h.lng)
      }));
      await AsyncStorage.setItem(`${ASYNC_STORAGE_ROUTE_DATA_PREFIX}${routeId}`, JSON.stringify(simplifiedHouses));
      
      // Clear previously notified houses for this route when starting fresh
      await AsyncStorage.removeItem(`${ASYNC_STORAGE_NOTIFIED_HOUSES_PREFIX}${routeId}`);

      const regions = currentHouses.map(house => ({
        identifier: `${routeId}_${house.id}`, // routeId_houseId
        latitude: parseFloat(house.lat),
        longitude: parseFloat(house.lng),
        radius: settingsRef.current.ALERT_DISTANCE,
        notifyOnEnter: true,
        notifyOnExit: false, // Only care about entry for now
      }));

      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
      setIsTracking(true);
      setError(null);
      console.log(`[useGeofencing] Started geofencing for ${regions.length} regions on route ${routeId}.`);

    } catch (err) {
      console.error('[useGeofencing] Error starting geofencing:', err);
      setError(err.message);
      setIsTracking(false);
    }
  }, [isTracking]);

  const stopTracking = useCallback(async () => {
    if (!isTracking) return;
    
    const routeId = currentRouteIdRef.current;

    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      if (routeId) {
        // Optionally clear stored route data for geofencing if route is definitively stopped/completed
        // await AsyncStorage.removeItem(`${ASYNC_STORAGE_ROUTE_DATA_PREFIX}${routeId}`);
        // Don't clear notified_houses here, as that's per-route session handled by RouteScreen
      }
      setIsTracking(false);
      setError(null);
      console.log('[useGeofencing] Stopped geofencing task.');
    } catch (err) {
      console.error('[useGeofencing] Error stopping geofencing:', err);
      setError(err.message);
    }
  }, [isTracking]);

  // Start/stop tracking based on enabled prop and availability of routeId
  useEffect(() => {
    if (enabled && currentRouteIdRef.current) {
      startTracking();
    } else {
      stopTracking(); // Will do nothing if not tracking
    }

    // Cleanup: stop geofencing when the component unmounts or if houses/enabled changes to stop
    return () => {
      Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME).then(hasStarted => {
        if (hasStarted) {
          Location.stopGeofencingAsync(GEOFENCE_TASK_NAME)
            .then(() => console.log('[useGeofencing] Cleaned up geofencing task on unmount/dependency change.'))
            .catch(e => console.error('[useGeofencing] Error cleaning up geofencing task:', e));
        }
      });
    };
  }, [enabled, startTracking, stopTracking]); // startTracking/stopTracking dependencies ensure they are fresh

  // Note: nearbyHouses, approachingHouses, processNotificationQueue, showNotification, checkNearbyHouses are removed
  // as the core notification logic is now handled by the background task.
  // The UI on RouteScreen will now primarily react to notifications received via Notifications.addNotificationReceivedListener,
  // which are triggered by the background task.

  return {
    isTracking, // Indicates if geofencing has been initiated
    error,      // Any error messages
    settings: geofenceSettings, // Current settings (e.g., ALERT_DISTANCE)
    saveSettings: async () => {}, // Placeholder, saveSettings logic can be re-added if needed
    playSound: playSoundFromURL, // Kept if foreground sound playing is still desired for other purposes
    // Explicitly not returning nearbyHouses/approachingHouses as they are no longer managed directly by this hook's foreground logic
  };
};

// Reminder: Ensure this file, especially TaskManager.defineTask,
// is imported early in your app lifecycle, e.g., in App.js or _layout.tsx.
// If useGeofencing is the only place importing TaskManager and defining the task,
// the task might not be registered if the hook isn't used immediately at app start.
// For Expo Router, you might register tasks in your root _layout.tsx. 