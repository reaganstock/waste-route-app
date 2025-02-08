import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

const ActiveRouteMap = ({ route, onHouseStatusChange }) => {
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [houses, setHouses] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [followsUserLocation, setFollowsUserLocation] = useState(true);
  const locationSubscription = useRef(null);

  useEffect(() => {
    setupLocationTracking();
    fetchRouteHouses();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const setupLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for navigation');
        return;
      }

      // Start location updates
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 5000    // Or every 5 seconds
        },
        location => {
          setCurrentLocation(location.coords);
          updateRouteProgress(location.coords);
          
          if (followsUserLocation && mapRef.current) {
            mapRef.current.animateCamera({
              center: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              },
              pitch: 45,
              heading: location.coords.heading || 0,
              zoom: 18
            });
          }
        }
      );

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({});
      setCurrentLocation(initialLocation.coords);
    } catch (error) {
      console.error('Error setting up location tracking:', error);
      Alert.alert('Error', 'Failed to setup location tracking');
    }
  };

  const fetchRouteHouses = async () => {
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .eq('route_id', route.id)
        .order('sequence');

      if (error) throw error;
      setHouses(data);

      // Calculate optimal route path
      if (data.length > 0) {
        const path = await calculateOptimalRoute(data);
        setRoutePath(path);
      }
    } catch (error) {
      console.error('Error fetching houses:', error);
      Alert.alert('Error', 'Failed to load route houses');
    }
  };

  const calculateOptimalRoute = async (housesList) => {
    // Basic implementation - connect houses in sequence
    // Could be improved with actual routing algorithm
    return housesList.map(house => ({
      latitude: house.lat,
      longitude: house.lng
    }));
  };

  const updateRouteProgress = async (userLocation) => {
    // Check for nearby houses and trigger notifications
    houses.forEach(house => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        house.lat,
        house.lng
      );

      // If within 50 meters and house is pending
      if (distance <= 0.05 && house.status === 'pending') {
        // Trigger notification/alert
        onHouseStatusChange(house.id, 'approaching');
      }
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula for calculating distance between coordinates
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value) => {
    return value * Math.PI / 180;
  };

  const handleHousePress = async (house) => {
    try {
      const { data, error } = await supabase
        .from('houses')
        .update({ status: house.status === 'collect' ? 'skip' : 'collect' })
        .eq('id', house.id)
        .single();

      if (error) throw error;
      
      // Update local state
      setHouses(houses.map(h => 
        h.id === house.id ? { ...h, status: data.status } : h
      ));

      // Notify parent component
      onHouseStatusChange(house.id, data.status);
    } catch (error) {
      console.error('Error updating house status:', error);
      Alert.alert('Error', 'Failed to update house status');
    }
  };

  const getMarkerColor = (status) => {
    switch (status) {
      case 'collect':
        return 'green';
      case 'skip':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        showsUserLocation={true}
        showsCompass={true}
        showsMyLocationButton={true}
        followsUserLocation={followsUserLocation}
        initialRegion={currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        } : null}
        mapType={Platform.OS === 'android' ? 'standard' : 'standard'}
        onPanDrag={() => setFollowsUserLocation(false)}
      >
        {houses.map(house => (
          <Marker
            key={house.id}
            coordinate={{
              latitude: house.lat,
              longitude: house.lng
            }}
            pinColor={getMarkerColor(house.status)}
            onPress={() => handleHousePress(house)}
          />
        ))}

        {routePath.length > 1 && (
          <Polyline
            coordinates={routePath}
            strokeWidth={3}
            strokeColor="#4169E1"
          />
        )}
      </MapView>

      <TouchableOpacity
        style={styles.recenterButton}
        onPress={() => {
          setFollowsUserLocation(true);
          if (currentLocation && mapRef.current) {
            mapRef.current.animateCamera({
              center: {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude
              },
              pitch: 45,
              heading: 0,
              zoom: 18
            });
          }
        }}
      >
        <View style={styles.recenterIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recenterIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4169E1',
    backgroundColor: '#fff',
  }
});

export default ActiveRouteMap; 