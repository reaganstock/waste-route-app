import { useState, useEffect } from 'react';
import { getDistance } from 'geolib';
import * as Notifications from 'expo-notifications';

const GEOFENCE_RADIUS = 100; // meters

export const useGeofencing = (currentLocation, houses) => {
  const [nearbyHouses, setNearbyHouses] = useState([]);
  const [lastNotifiedHouseId, setLastNotifiedHouseId] = useState(null);

  useEffect(() => {
    if (!currentLocation || !houses) return;

    const checkNearbyHouses = async () => {
      const nearby = houses.filter(house => {
        const distance = getDistance(
          { 
            latitude: currentLocation.coords.latitude, 
            longitude: currentLocation.coords.longitude 
          },
          { 
            latitude: parseFloat(house.lat), 
            longitude: parseFloat(house.lng) 
          }
        );
        return distance <= GEOFENCE_RADIUS;
      });

      setNearbyHouses(nearby);

      // Check for new houses to notify about
      const newNearbyHouses = nearby.filter(
        house => house.id !== lastNotifiedHouseId && house.status === 'pending'
      );

      if (newNearbyHouses.length > 0) {
        const house = newNearbyHouses[0];
        await notifyNearbyHouse(house);
        setLastNotifiedHouseId(house.id);
      }
    };

    checkNearbyHouses();
  }, [currentLocation, houses, lastNotifiedHouseId]);

  const notifyNearbyHouse = async (house) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Nearby House',
          body: `You are near ${house.address}`,
          data: { houseId: house.id },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  return {
    nearbyHouses,
  };
}; 