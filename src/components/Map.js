import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Default to San Francisco coordinates
const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

const Map = ({ houses = [], onHousePress, showStreetView = false }) => {
  const mapRef = useRef(null);
  const { location } = useLocation();
  const [mapType, setMapType] = useState('standard');
  const [region, setRegion] = useState(DEFAULT_REGION);

  useEffect(() => {
    if (location?.coords) {
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } else if (houses.length > 0) {
      // If no location, center on the first house
      const firstHouse = houses[0];
      const newRegion = {
        latitude: parseFloat(firstHouse.lat),
        longitude: parseFloat(firstHouse.lng),
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      setRegion(newRegion);
    }
  }, [location, houses]);

  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  const getMarkerColor = (status) => {
    switch (status) {
      case 'skip':
        return '#EF4444'; // Red
      case 'collect':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton
        initialRegion={region}
        region={region}
      >
        {houses?.map((house) => (
          <Marker
            key={house.id}
            coordinate={{
              latitude: parseFloat(house.lat),
              longitude: parseFloat(house.lng)
            }}
            pinColor={getMarkerColor(house.status)}
            onPress={() => onHousePress(house)}
          />
        ))}
      </MapView>

      {/* Map Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleMapType}
        >
          <Ionicons 
            name={mapType === 'standard' ? 'map' : 'map-outline'} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>

        {showStreetView && (
          <TouchableOpacity 
            style={[styles.controlButton, styles.streetViewButton]}
            onPress={() => {/* Implement street view toggle */}}
          >
            <Ionicons name="navigate" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    top: 120,
    right: 20,
    gap: 10,
  },
  controlButton: {
    backgroundColor: '#1F2937',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  streetViewButton: {
    backgroundColor: '#3B82F6',
  },
});

export default Map; 