import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance } from 'geolib';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

// Constants
const GEOFENCE_RADIUS = 200; // meters
const MIN_DISTANCE_THRESHOLD = 50; // meters
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useGeofencing = (houses, enabled = false) => {
  const [nearbyHouses, setNearbyHouses] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const lastNotifications = useRef(new Map());
  const locationSubscription = useRef(null);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    return getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
  }, []);

  const shouldNotify = useCallback((houseId) => {
    const lastNotification = lastNotifications.current.get(houseId);
    const now = Date.now();
    return !lastNotification || (now - lastNotification) > NOTIFICATION_COOLDOWN;
  }, []);

  const showNotification = useCallback(async (house) => {
    if (!shouldNotify(house.id)) return;

    const isSkip = house.status === 'skip';
    const isNew = house.status === 'new customer';
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isSkip ? '⚠️ Skip House Nearby' : isNew ? '🆕 New Customer Approaching' : '🏠 House Nearby',
          body: `${house.address}${house.notes ? `\nNote: ${house.notes}` : ''}`,
          data: { houseId: house.id, status: house.status },
          sound: true,
          priority: isSkip ? 'high' : 'default',
        },
        trigger: null,
      });

      lastNotifications.current.set(house.id, Date.now());
    } catch (error) {
      console.error('Error showing notification:', error);
      setError('Failed to show notification');
    }
  }, [shouldNotify]);

  const checkNearbyHouses = useCallback(async (location) => {
    if (!houses || !enabled) return;

    try {
      const nearby = houses.filter(house => {
        if (!house.lat || !house.lng) return false;
        if (house.status !== 'skip' && house.status !== 'new customer') return false;

        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          parseFloat(house.lat),
          parseFloat(house.lng)
        );

        return distance <= GEOFENCE_RADIUS;
      });

      // Find newly detected houses
      const newNearby = nearby.filter(house => 
        !nearbyHouses.find(h => h.id === house.id)
      );

      // Show notifications for new nearby houses
      for (const house of newNearby) {
        await showNotification(house);
      }

      setNearbyHouses(nearby);
    } catch (error) {
      console.error('Error checking nearby houses:', error);
      setError('Failed to check nearby houses');
    }
  }, [houses, enabled, nearbyHouses, calculateDistance, showNotification]);

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
          distanceInterval: MIN_DISTANCE_THRESHOLD,
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
    isTracking,
    error,
  };
}; 