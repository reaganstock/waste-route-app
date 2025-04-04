import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance } from 'geolib';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { AppState } from 'react-native';

// Configurable settings for performance tuning in production
const GEOFENCE_SETTINGS = {
  OUTER_RADIUS: 500, // meters - early warning
  INNER_RADIUS: 100, // meters - immediate alert
  MIN_DISTANCE_CHANGE: 10, // meters - minimum movement to trigger check (reduced from 30)
  NOTIFICATION_COOLDOWN: 2 * 60 * 1000, // 2 minutes between repeat notifications (reduced from 5 min)
  BACKGROUND_UPDATE_INTERVAL: 20 * 1000, // 20 seconds in background (reduced from 30)
  FOREGROUND_UPDATE_INTERVAL: 5 * 1000, // 5 seconds in foreground (reduced from 10)
  LOCATION_ACCURACY: Location.Accuracy.High // Increased accuracy from Balanced
};

export const useGeofencing = (houses, enabled = false) => {
  const [nearbyHouses, setNearbyHouses] = useState([]);
  const [approachingHouses, setApproachingHouses] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  
  // Performance optimizations with refs
  const lastNotifications = useRef(new Map());
  const locationSubscription = useRef(null);
  const lastLocation = useRef(null);
  const appState = useRef(AppState.currentState);
  const housesRef = useRef(houses);
  const enabledRef = useRef(enabled);
  
  // Update refs when props change
  useEffect(() => {
    housesRef.current = houses;
    enabledRef.current = enabled;
  }, [houses, enabled]);

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
    return !lastNotification || (now - lastNotification) > GEOFENCE_SETTINGS.NOTIFICATION_COOLDOWN;
  }, []);

  const showNotification = useCallback(async (house, distance) => {
    // Determine house status
    const isSkip = house.status?.toLowerCase() === 'skip';
    const isNewCustomer = house.status?.toLowerCase() === 'new customer' || house.status?.toLowerCase() === 'new';
    const isApproaching = distance > GEOFENCE_SETTINGS.INNER_RADIUS;
    const notificationType = isApproaching ? 'approaching' : 'arriving';
    
    if (!shouldNotify(house.id, notificationType)) return;
    
    try {
      // Get color based on status - use the correct color scheme
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
          '🏠 Regular House';
           
      const body = `${isApproaching ? 'Approaching' : 'Arriving at'}: ${house.address}
${Math.round(distance)}m away${house.notes ? `\nNote: ${house.notes}` : ''}`;

      // Log notification for debugging
      console.log(`Showing notification for ${house.status} house: ${house.address}`);

      // Schedule the notification with more attention-grabbing properties
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { 
            houseId: house.id, 
            status: house.status,
            distance,
            address: house.address,
            statusColor, // Add the color for UI usage
            lat: house.lat,
            lng: house.lng
          },
          categoryIdentifier: 'route',
          sound: true,
          priority: 'high',
          vibrate: isSkip || isNewCustomer ? [0, 250, 250, 250] : undefined, // Vibrate for skip/new customer
        },
        trigger: null, // Send immediately
      });

      // Record notification time to prevent spam
      const key = `${house.id}-${notificationType}`;
      lastNotifications.current.set(key, Date.now());
    } catch (error) {
      console.error('Error showing notification:', error);
      setError('Failed to show notification');
    }
  }, [shouldNotify]);

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
      
      if (distance < GEOFENCE_SETTINGS.MIN_DISTANCE_CHANGE) {
        return;
      }
    }
    
    // Update last location
    lastLocation.current = location;

    try {
      const nearby = [];
      const approaching = [];

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

        // Track houses within outer radius
        if (distance <= GEOFENCE_SETTINGS.OUTER_RADIUS) {
          const houseWithDistance = { ...house, distance };
          
          if (distance <= GEOFENCE_SETTINGS.INNER_RADIUS) {
            nearby.push(houseWithDistance);
          } else {
            approaching.push(houseWithDistance);
          }
        }
      }

      // Sort by distance
      nearby.sort((a, b) => a.distance - b.distance);
      approaching.sort((a, b) => a.distance - b.distance);

      // Find newly detected houses - optimize comparison with Set
      const currentNearbyIds = new Set(nearbyHouses.map(h => h.id));
      const currentApproachingIds = new Set(approachingHouses.map(h => h.id));
      
      const newNearby = nearby.filter(house => !currentNearbyIds.has(house.id));
      const newApproaching = approaching.filter(house => 
        !currentApproachingIds.has(house.id) && !currentNearbyIds.has(house.id)
      );

      // Batch notifications for better performance
      const notificationPromises = [];
      
      // Show notifications for new nearby houses
      for (const house of newNearby) {
        notificationPromises.push(showNotification(house, house.distance));
      }

      // Show notifications for special houses that are approaching
      for (const house of newApproaching) {
        if (house.status === 'skip' || house.status === 'new customer') {
          notificationPromises.push(showNotification(house, house.distance));
        }
      }
      
      // Process all notifications in parallel
      await Promise.all(notificationPromises);

      setNearbyHouses(nearby);
      setApproachingHouses(approaching);
    } catch (error) {
      console.error('Error checking nearby houses:', error);
      setError('Failed to check nearby houses');
    }
  }, [nearbyHouses, approachingHouses, calculateDistance, showNotification]);

  const startTracking = useCallback(async () => {
    if (isTracking || !enabledRef.current) return;

    try {
      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission denied');
      }
      
      // Try to get background permission for better tracking
      let backgroundPermission = false;
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        backgroundPermission = backgroundStatus === 'granted';
      } catch (e) {
        // Background permission not supported or denied
        console.warn('Background location not available:', e);
      }

      // Configure location tracking based on permissions
      const locationConfig = {
        accuracy: GEOFENCE_SETTINGS.LOCATION_ACCURACY,
        distanceInterval: GEOFENCE_SETTINGS.MIN_DISTANCE_CHANGE,
        timeInterval: appState.current === 'active' 
          ? GEOFENCE_SETTINGS.FOREGROUND_UPDATE_INTERVAL 
          : GEOFENCE_SETTINGS.BACKGROUND_UPDATE_INTERVAL,
        mayShowUserSettingsDialog: true,
      };

      // Start location updates
      locationSubscription.current = await Location.watchPositionAsync(
        locationConfig,
        (location) => {
          checkNearbyHouses(location.coords);
        }
      );

      setIsTracking(true);
      setError(null);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setError(error.message);
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
  };
}; 