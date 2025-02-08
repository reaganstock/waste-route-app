import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let subscription;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

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
  };
}; 