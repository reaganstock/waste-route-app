import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform, Alert, Linking } from 'react-native';

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to track your position on the map and optimize your route.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Error requesting location permission:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    let subscription;

    const startLocationTracking = async () => {
      try {
        // Check current permission status without requesting
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(status);
        
        // Only proceed with location tracking if permissions are already granted
        if (status === 'granted') {
          // Get initial location
          const initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation(initialLocation);

          // Subscribe to location updates
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 10000, // Update every 10 seconds
              distanceInterval: 10, // Update every 10 meters
            },
            (newLocation) => {
              setLocation(newLocation);
            }
          );
        } else {
          // Just set the status, don't show an error - we'll request when needed
          setErrorMsg('Location permission not granted');
        }
      } catch (err) {
        setErrorMsg('Error getting location: ' + err.message);
        console.warn('Location error:', err);
      }
    };

    startLocationTracking();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  return {
    location,
    errorMsg,
    permissionStatus,
    requestLocationPermission
  };
}; 