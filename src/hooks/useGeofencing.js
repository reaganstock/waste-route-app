import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance } from 'geolib';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

// Constants
const GEOFENCE_SETTINGS = {
  OUTER_RADIUS: 500, // meters - early warning
  INNER_RADIUS: 200, // meters - immediate alert
  MIN_DISTANCE_CHANGE: 50, // meters - minimum movement to trigger check
  NOTIFICATION_COOLDOWN: 5 * 60 * 1000, // 5 minutes between repeat notifications
};

export const useGeofencing = (houses, enabled = false) => {
  const [nearbyHouses, setNearbyHouses] = useState([]);
  const [approachingHouses, setApproachingHouses] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const lastNotifications = useRef(new Map());
  const locationSubscription = useRef(null);
  const lastLocation = useRef(null);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
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
    const isSkip = house.status === 'skip';
    const isNew = house.status === 'new customer';
    const isApproaching = distance > GEOFENCE_SETTINGS.INNER_RADIUS;
    const notificationType = isApproaching ? 'approaching' : 'arriving';
    
    if (!shouldNotify(house.id, notificationType)) return;
    
    try {
      const title = isSkip ? '⚠️ Skip House' : 
                   isNew ? '🆕 New Customer' : 
                   '🏠 Regular House';
                   
      const body = `${isApproaching ? 'Approaching' : 'Arriving at'}: ${house.address}
${Math.round(distance)}m away${house.notes ? `\nNote: ${house.notes}` : ''}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { 
            houseId: house.id, 
            status: house.status,
            distance,
            address: house.address,
            lat: house.lat,
            lng: house.lng
          },
          categoryIdentifier: 'route',
        },
        trigger: null,
      });

      const key = `${house.id}-${notificationType}`;
      lastNotifications.current.set(key, Date.now());
    } catch (error) {
      console.error('Error showing notification:', error);
      setError('Failed to show notification');
    }
  }, [shouldNotify]);

  const checkNearbyHouses = useCallback(async (location) => {
    if (!houses || !enabled) return;

    try {
      const nearby = [];
      const approaching = [];

      houses.forEach(house => {
        if (!house.lat || !house.lng) return;

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
      });

      // Sort by distance
      nearby.sort((a, b) => a.distance - b.distance);
      approaching.sort((a, b) => a.distance - b.distance);

      // Find newly detected houses
      const newNearby = nearby.filter(house => 
        !nearbyHouses.find(h => h.id === house.id)
      );

      const newApproaching = approaching.filter(house =>
        !approachingHouses.find(h => h.id === house.id) &&
        !nearby.find(h => h.id === house.id)
      );

      // Show notifications for new nearby and approaching houses
      for (const house of newNearby) {
        await showNotification(house, house.distance);
      }

      for (const house of newApproaching) {
        if (house.status === 'skip' || house.status === 'new customer') {
          await showNotification(house, house.distance);
        }
      }

      setNearbyHouses(nearby);
      setApproachingHouses(approaching);
    } catch (error) {
      console.error('Error checking nearby houses:', error);
      setError('Failed to check nearby houses');
    }
  }, [houses, enabled, nearbyHouses, approachingHouses, calculateDistance, showNotification]);

  const startTracking = useCallback(async () => {
    if (isTracking || !enabled) return;

    try {
      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission denied');
      }

      // Start location updates
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: GEOFENCE_SETTINGS.MIN_DISTANCE_CHANGE,
          timeInterval: 10000, // 10 seconds
        },
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
  }, [enabled, isTracking, checkNearbyHouses]);

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